import json
import os
import logging
from typing import Dict, Any, List, Optional
import requests
from datetime import datetime, timedelta

from haystack.components.builders import ChatPromptBuilder
from haystack.dataclasses import ChatMessage
from haystack import Pipeline
from haystack_integrations.components.generators.openrouter import OpenRouterChatGenerator

logger = logging.getLogger(__name__)


class BaseClassifier:
    """Base class for classifiers with shared functionality"""

    def __init__(self):
        try:
            import tiktoken
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
            logger.info("Initialized tiktoken for accurate token counting")
        except Exception as e:
            logger.warning(f"Failed to load tiktoken encoder, falling back to character estimation: {e}")
            self.tokenizer = None

        # Authentication configuration
        self.keycloak_url = os.getenv('CLASSIFIER_AUTH_URL')
        self.client_id = os.getenv('CLASSIFIER_AUTH_CLIENT_ID')
        self.client_secret = os.getenv('CLASSIFIER_AUTH_CLIENT_SECRET')

        # API configuration
        self.api_base_url = os.getenv('CLASSIFIER_API_BASE_URL', 'http://management:8080')

        # Token caching
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for given text"""
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        else:
            # Fallback: rough estimation (1 token ~ 4 characters)
            return len(text) // 4

    def _get_access_token(self, force_refresh: bool = False) -> str:
        """
        Obtain an access token from Keycloak using client credentials flow.
        Caches the token and refreshes it when expired.

        Args:
            force_refresh: Force token refresh even if cached token exists

        Returns:
            Access token string

        Raises:
            requests.RequestException: If authentication fails
        """
        # Check if we have a valid cached token
        if not force_refresh and self._access_token and self._token_expiry:
            if datetime.now() < self._token_expiry:
                logger.debug("Using cached access token")
                return self._access_token

        logger.info("Obtaining new access token from Keycloak")

        try:
            response = requests.post(
                self.keycloak_url,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                data={
                    'grant_type': 'client_credentials',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret
                },
                timeout=10
            )
            response.raise_for_status()

            token_data = response.json()
            self._access_token = token_data['access_token']

            expires_in = token_data.get('expires_in', 300)
            self._token_expiry = datetime.now() + timedelta(seconds=expires_in - 60)

            logger.info("Successfully obtained access token")
            return self._access_token

        except requests.RequestException as e:
            logger.error(f"Failed to obtain access token: {e}")
            raise

    def merge_results(self, standard_res: Dict[str, Any], ilo_res: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combines the standard data extraction JSON with the specialized ILO Eligibility result.
        """
        if not standard_res:
            return None

        ilo_eligible = ilo_res.get("eligible", True)
        standard_res["eligible"] = standard_res.get("eligible", True) and ilo_eligible

        if "criteria" not in standard_res:
            standard_res["criteria"] = {}

        standard_res["criteria"]["ILO Eligibility"] = {
            "status": str(ilo_eligible).lower(),
            "evidence": ilo_res.get("evidence", "No specialized ILO analysis provided.")
        }

        if not ilo_eligible and standard_res.get("exclusion_reason") is None:
            standard_res["exclusion_reason"] = f"ILO is ineligible: {ilo_res.get('evidence')}"

        return standard_res

    def fetch_criteria(self) -> List[Dict[str, Any]]:
        """
        Fetches classification criteria from the backend API.
        Returns criteria in the backend's native camelCase format.

        Returns:
            List of criteria dictionaries with keys: id, fieldName, evaluationLogic, examples, hard

        Raises:
            requests.RequestException: If the API request fails
            ValueError: If the response format is invalid
        """
        logger.info("Fetching classification criteria from API...")

        try:
            access_token = self._get_access_token()

            url = f"{self.api_base_url}/api/v1/criterion-types"
            headers = {'Authorization': f'Bearer {access_token}'}
            logger.debug(f"Requesting criteria from: {url}")
            response = requests.get(url, headers=headers, timeout=10)

            # If we get 401, try refreshing the token once
            if response.status_code == 401:
                logger.warning("Received 401, refreshing access token and retrying")
                access_token = self._get_access_token(force_refresh=True)
                headers = {'Authorization': f'Bearer {access_token}'}
                response = requests.get(url, headers=headers, timeout=10)

            response.raise_for_status()

            data = response.json()

            if 'content' not in data:
                raise ValueError("Response missing 'content' field")

            criteria = data['content']

            if not criteria:
                logger.warning("API returned 0 criteria. Falling back to hardcoded criteria.")
                return self._get_fallback_criteria()

            logger.info(f"Successfully fetched {len(criteria)} criteria")
            return criteria

        except requests.RequestException as e:
            logger.error(f"Failed to fetch criteria from API: {e}")
            logger.warning("Falling back to hardcoded criteria")
            return self._get_fallback_criteria()
        except (ValueError, KeyError) as e:
            logger.error(f"Failed to parse API response: {e}")
            logger.warning("Falling back to hardcoded criteria")
            return self._get_fallback_criteria()

    def _get_fallback_criteria(self) -> List[Dict[str, Any]]:
        """
        Returns hardcoded criteria as fallback when API is unavailable.
        """
        return [
            {"id": 1, "evaluationLogic": "Check for a section defining eligible applicants. If such a section exists, treat the list of eligible entities as STRICT and EXHAUSTIVE (meaning if you are not listed, you are excluded). If the ILO (an International Organization) does not clearly fit into one of the listed categories, EXCLUDE it. Do not require an explicit ban. Only assume eligibility if the text is completely silent on applicant types.", "examples": None, "hard": True, "fieldName": "ILO Eligibility"},
            {"id": 2, "evaluationLogic": "Exclude if the funding creates a financial liability (debt, equity, or repayment obligation) for the applicant. Include ONLY if there is a non-reimbursable component (e.g., grant, non-repayable contribution, cooperative agreement) available. If the opportunity is purely for loans, guarantees, or investment capital without a separate grant window, EXCLUDE.", "examples": None, "hard": True, "fieldName": "Funding instrument is grant"},
            {"id": 3, "evaluationLogic": "Exclude if the maximum stated grant size is below USD 50,000.", "examples": None, "hard": True, "fieldName": "Grant size above threshold"},
            {"id": 4, "evaluationLogic": "Exclude if any mandatory submission deadline has passed. Pay close attention to multi-stage processes (e.g., 'Expression of Interest', 'Concept Note') and exclude if the deadline for the first required step is in the past, even if the final deadline is in the future.", "examples": None, "hard": True, "fieldName": "Deadline is future"},
            {"id": 6, "evaluationLogic": "Flag if the call appears to be for procurement of goods/services or a consultancy tender rather than a project grant. Look for terms like 'Request for Proposal (RFP)', 'Invitation to Bid (ITB)', 'consultant', 'services'.", "examples": None, "hard": False, "fieldName": "Is procurement or tender"},
            {"id": 7, "evaluationLogic": "Flag only if co-financing or cost-sharing is a mandatory, required condition for the application. Do not flag if it is merely mentioned as optional, encouraged, an asset, or a positive factor.", "examples": None, "hard": False, "fieldName": "Requires cofinancing"},
            {"id": 8, "evaluationLogic": "Flag if the applicant must have a specific pre-existing accreditation with another body (e.g., GEF, CIF, Green Climate Fund).", "examples": None, "hard": False, "fieldName": "Requires specific accreditation"},
            {"id": 9, "evaluationLogic": "Flag if the rules state that any consortium or partnership must be led by a non-UN entity.", "examples": None, "hard": False, "fieldName": "Has consortium leadership rules"},
            {"id": 10, "evaluationLogic": "Flag if eligibility is restricted to applicants legally registered or based in the donor's domestic territory only.", "examples": None, "hard": False, "fieldName": "Applicant origin is restricted"}
        ]

    def setup_prompt_builder(self, criteria: List[Dict[str, Any]], rag_mode: bool = False):
        """
        Set up the prompt template for CFP classification using dynamic criteria.

        Args:
            criteria: List of classification criteria
            rag_mode: If True, adds note about excerpts in the prompt
        """
        from haystack.components.builders import ChatPromptBuilder
        from haystack.dataclasses import ChatMessage

        # Separate criteria into hard and flag categories
        hard_criteria = sorted([c for c in criteria if c['hard']], key=lambda x: x['id'])
        flag_criteria = sorted([c for c in criteria if not c['hard']], key=lambda x: x['id'])

        hard_criteria_str = "\n".join([
            f"{i+1}. **{c['fieldName']}**: {c['evaluationLogic']}"
            for i, c in enumerate(hard_criteria)
        ])

        flag_criteria_str = "\n".join([
            f"{i+len(hard_criteria)+1}. **{c['fieldName']}**: {c['evaluationLogic']}"
            for i, c in enumerate(flag_criteria)
        ])

        hard_criteria_json_fields_list = [
            f'    "{c["fieldName"]}": {{"status": "true/false/null", "evidence": "text or null"}}'
            for c in hard_criteria
        ]

        flag_json_fields_list = [
            f'    "{c["fieldName"]}": {{"status": "true/false/null", "evidence": "text or null"}}'
            for c in flag_criteria
        ]

        all_criteria_json_fields = ",\n".join(hard_criteria_json_fields_list + flag_json_fields_list)

        predefined_themes_str = """
                  * International Labour Standards & Legal Frameworks: (Focuses on the legal system: developing, ratifying, and implementing ILO Conventions, Protocols, and Recommendations; includes legal frameworks and supervisory mechanisms.)
                  * Fundamental Principles and Rights at Work: (Focuses on the core rights: elimination of child labour, forced labour, and discrimination; plus freedom of association and the right to collective bargaining.)
                  * Employment Policy & Job Creation: (Covers policies for full and productive employment, employment-intensive planning, public employment programs, and strengthening labour market institutions.)
                  * Skills Development & Vocational Training: (Includes vocational education, quality apprenticeships, skills needs anticipation, curriculum design, certification, and upskilling/reskilling for lifelong learning.)
                  * Labour Migration: (Covers governance of migration, protection of migrant workers' rights, skills recognition, and extending social protection to migrants.)
                  * Sustainable Enterprises: (Focuses on creating and growing enterprises of all sizes, including support for entrepreneurship, productivity, innovation, and responsible business practices.)
                  * Sectoral Policies (Industry-Specific Work): (Focuses on labour issues within specific economic sectors, such as agriculture, industry, or services, often through tripartite sectoral meetings.)
                  * Social Protection: (Covers designing and expanding social protection systems, including social security, unemployment benefits, child allowances, pensions, and building universal social protection floors.)
                  * Working Conditions & Equality: (Covers improving on-the-job conditions like wages, working time, and work-life balance; also promotes equality, diversity, inclusion, closing the gender pay gap, and preventing violence.)
                  * OSH & Labour Inspection: (Covers occupational safety and health (OSH) to create safe environments and prevent accidents/injuries, as well as strengthening labour administration and inspection systems to enforce compliance.)
                  * Social Dialogue & Tripartism: (Focuses on strengthening dialogue, negotiation, and consultation between governments, employers, and workers (tripartism); includes collective bargaining and dispute resolution.)
                  * Just Transitions towards Environmentally Sustainable Economies and Societies: (Focuses on the social dimension of climate action, including policy for a 'just transition' to low-carbon economies, creating green jobs, and skills for environmental sustainability.)
                  * Decent Work in Supply Chains: (Focuses on promoting responsible business conduct and improving working conditions specifically within global and domestic supply chains.)
                  * Decent Work in Crisis and Post-Crisis Situations: (Covers crisis response to natural disasters, conflicts, or economic/health crises; includes restoring livelihoods and rebuilding labour markets in fragile situations.)
                  * Informal Economy: (Focuses on policies and strategies to help workers and enterprises transition from the informal to the formal economy, including access to social protection and rights.)"""

        rag_note = ""
        if rag_mode:
            rag_note = "\n\nIMPORTANT: The context below contains the most relevant excerpts from a larger document. Base your analysis on this information.\n"

        current_date_str = datetime.now().strftime('%Y-%m-%d')

        prompt = f"""
    You are an expert Call for Proposals (CfP) analysis AI for the International Labour Organization (ILO).
    The ILO is a UN agency and an international/intergovernmental organization.
    **Your entire response MUST be in English.** All summaries, explanations, and evidence you provide must be in English.
    
    Your task is to perform two actions based ONLY on the provided context:
    1. Classify the CfP's eligibility based on the hard criteria and flags provided.
    2. Extract key structured data from the CfP text.
    
    **IMPORTANT: When writing summaries or extracting text, you MUST spell out any domain-specific acronyms to ensure clarity. For example, instead of "AFOLU", write "Agriculture, Forestry, and Other Land Use". Well-known acronyms like "ILO" or "UN" are acceptable.**
    
    Return a single, valid JSON object containing both the classification and the extracted data.{rag_note}
    
    Context:
    {{{{ content }}}}
    
    ---
    **TASK 1: ELIGIBILITY CLASSIFICATION**
    ---
    Evaluate the CfP against the following criteria. Be conservative with exclusions (when unclear, include) but liberal with flags.
    **For the "evidence" field, you MUST provide a short explanation in English justifying your status choice. If you quote from the source text to support your explanation, you MUST translate the quote into English.**
    
    **HARD EXCLUSION CRITERIA - If ANY fail, set eligible: false:**
    {hard_criteria_str}
    
    **FLAGGING CRITERIA - Note issues but don't exclude:**
    {flag_criteria_str}
    
    **Generate the following summary fields based on your classification:**
    - **classification_summary**: **An explanation for the final `eligible` status, mentioning the most critical criteria that led to the decision. Do not use acronyms in this summary.**
    - **exclusion_reason**: If `eligible` is `false`, provide a brief, one-sentence explanation for the exclusion based on the failed hard criterion (e.g., "The Expression of Interest deadline has passed." or "The grant is restricted to local NGOs only."). If `eligible` is `true`, this MUST be `null`.
    
    ---
    **TASK 2: DATA EXTRACTION**
    ---
    Extract the following fields from the CfP text. If a value cannot be found, use `null` for single fields or an empty list `[]` for list fields.
    
    - **deadline**: The **first mandatory submission date**. Format strictly as YYYY-MM-DD. **For context, today's date is {current_date_str}.**
        * **Priority:** If the CfP mentions a multi-stage process (e.g., 'Expression of Interest', 'Concept Note', 'Full Proposal'), you **must** extract the deadline for the **earliest required step**.
        * **Example:** If the text says 'Expression of Interest due March 1' and 'Full proposals due June 1', you must extract the 'Expression of Interest' deadline (YYYY-03-01).
        * **Ambiguity:** If the date is ambiguous, not clearly mandatory, or cannot be formatted, use null.
    - **deadline_text**: **The deadline as it appears in the original text.**
    - **funding_min**: The minimum funding amount as a number, without currency symbols or commas. **If words like 'million' or 'billion' are used, convert them to the full number (e.g., '2 million' becomes 2000000). If not specified, use null.**
    - **funding_max**: The maximum funding amount as a number, without currency symbols or commas. **If words like 'million' or 'billion' are used, convert them to the full number (e.g., '5 million' becomes 5000000).** If a range is not given, use the single stated amount for both min and max.
    - **funding_currency**: The 3-letter ISO currency code (e.g., USD, EUR, CHF).
    - **organization**: Identify the ultimate donor. **CRITICAL: The ILO is the APPLICANT. NEVER list the ILO as the donor unless the text explicitly says the ILO is funding the project.**
        * **For governments:** Abstract to the sovereign level (e.g., "Government of Germany" instead of "German Ministry of Foreign Affairs").
        * **For multilateral/funds:** Report the specific fund name (e.g., "Green Climate Fund", "Elsie Initiative Fund").
        * **Format:** Spell out all acronyms. If the donor is not clearly stated, return `null`.
    - **title**: The official title or name of the Call for Proposals. If an explicit title is found, use it. If no explicit title is present, **you MUST deduce and create a short, descriptive title** based on the CfP's main objective and scope (e.g., "Grant for Innovative Solutions in Green Energy" or "Call for Research on Social Protection"). Use `null` only as a last resort if deduction is impossible.
    - **contact**: Relevant contact information, like an email address or a link to a contact page.
    - **country**: A list of strings of ALL eligible individual countries. **CRITICAL: If a region (e.g., 'European Union', 'Sub-Saharan Africa') or group (e.g., 'DAC members', 'LDCs') is mentioned, you MUST expand this and list ALL individual member countries belonging to that group based on your internal knowledge. Do not list the group name itself.**
    - **theme**: A list of strings of relevant themes from the CfP. **You MUST choose one or more themes from the following predefined list.** Select the most relevant themes based on the text. If none of the themes are a good fit, return an empty list `[]`. Do not create your own themes.
                **Predefined Themes:**{predefined_themes_str}
    - **organization_type**: A list of strings of the types of organizations that are eligible to apply (e.g., "NGOs", "CSOs", "Academic Institutions").
    - **applicationProcess**: An array of objects representing key stages and dates in the application timeline. Each object must have a 'date' (strictly format as YYYY-MM-DD, or use null if ambiguous or not present) and a 'description' of the milestone. If no process is described, return an empty list []. (Example: [{{ "date": "2025-09-17", "description": "Expression of Interest deadline" }}, {{ "date": "2025-10-24", "description": "Full proposal submission for shortlisted applicants" }}])
    - **implementationPeriod**: The project's required duration as a string, exactly as stated in the text (e.g., "24 months", "from 1 to 3 years").
    - **eligibleActivities**: A list of strings describing supported activities (e.g., "capacity building", "technical assistance") and eligible costs (e.g., "personnel fees", "travel expenses").
    - **fundingRestrictions**: A list of strings describing ineligible costs (e.g., "vehicle purchase", "construction") or limitations on funding (e.g., "overhead costs cannot exceed 15%").
    - **proposal_summary**: Write a comprehensive narrative summary in a single paragraph. It should seamlessly integrate the following key details in a fluent text:
      * The funding **Organization** and the CfP's main **objective/themes**.
      * Eligible **countries** (summarize if there are more than 5, e.g., "37 African countries").
      * The **funding amount** and the project **implementation period**.
      * Critical eligibility details, including **UN/International Organization eligibility** and any specific **consortia rules**.
      * The primary application **deadline**.
      * The **co-financing** status (e.g., mandatory, encouraged, not required).

    ---
    **FINAL OUTPUT**
    ---
    **CRITICAL REMINDER: The entire response, including ALL text within the `evidence`, `classification_summary`, and `proposal_summary` fields, MUST be in English. If the context is in another language, translate your findings.**
    
    Your response MUST be ONLY the JSON object, starting with an opening brace `{{` and ending with a closing brace `}}`. Do NOT include any introductory text, explanations, or markdown formatting.
    
    Return ONLY valid JSON in this exact format:
    
    {{
      "eligible": true/false,
      "exclusion_reason": "string or null",
      "classification_summary": "string",
      "criteria": {{
    {all_criteria_json_fields}
      }},
      "extracted_data": {{
        "deadline": "YYYY-MM-DD or null",
        "deadline_text": "string or null",
        "funding_min": "number or null",
        "funding_max": "number or null",
        "funding_currency": "string or null",
        "organization": "string or null",
        "title": "string or null",
        "contact": "string or null",
        "country": ["string"],
        "theme": ["string"],
        "organization_type": ["string"],
        "applicationProcess": [{{ "date": "YYYY-MM-DD or null", "description": "string" }}],
        "implementationPeriod": "string or null",
        "eligibleActivities": ["string"],
        "fundingRestrictions": ["string"],
        "proposal_summary": "string"
      }},
      "confidence_score": 0.0-1.0
    }}
    """

        return ChatPromptBuilder(template=[ChatMessage.from_system(prompt)])

    def setup_ilo_match_prompt_builder(self) -> ChatPromptBuilder:
        """Sets up a specific prompt for ILO Matching analysis."""
        ilo_match_prompt = f"""
            You are a senior programme officer at the International Labour Organization (ILO).
            
            The ILO is a UN agency focused on labour standards, employment, social protection,
            social dialogue, and related development and policy work.
            
            Task:
            Based on the Call for Proposals below, assess how likely it is that the ILO would be
            interested in applying for this opportunity.
    
            Use the full range of the scale where appropriate.
    
            Some programmes may be legally open to ILO but clearly outside its practical mandate (e.g. education exchange or student mobility programmes).
    
            Consider whether the call aligns with:
            - ILO’s mandate and thematic areas
            - Typical ILO roles (policy support, technical assistance, capacity building, research etc)
            - The type of programme and target applicants
            
            If unsure, choose the more likely option.
            
            Return ONLY a valid JSON object in the following format:
            {{
              "value": 0.0-1.0,
              "evidence": "A concise explanation in English."
            }}
            
            Context (summary prepared by CfP classifier):
            {{{{ content }}}}
            """

        return ChatPromptBuilder(template=[ChatMessage.from_system(ilo_match_prompt)])

    def setup_ilo_eligibility_prompt_builder(self) -> ChatPromptBuilder:
        """Sets up a specific prompt for ILO Eligibility analysis."""
        ilo_prompt = f"""
            You are an expert legal analyst for the International Labour Organization (ILO).
            The ILO is a UN agency and an international/intergovernmental organization.
        
            Task: Determine if the ILO is eligible to apply for this Call for Proposals. If unsure pick the more likely option.
        
            Return ONLY a valid JSON object in this format:
            {{
                "eligible": true/false,
                "evidence": "A concise explanation in English."
            }}
            
            Context:
            {{{{ content }}}}
            """
        return ChatPromptBuilder(template=[ChatMessage.from_system(ilo_prompt)])

    def create_ilo_eligibility_pipeline(self) -> Pipeline:
        """Creates a pipeline for ILO eligibility checking."""
        ilo_eligibility_model = os.getenv('CLASSIFIER_ILO_ELIGIBILITY_MODEL', os.getenv('CLASSIFIER_MODEL'))
        ilo_eligibility_llm = OpenRouterChatGenerator(model=ilo_eligibility_model)
        ilo_eligibility_prompt_builder = self.setup_ilo_eligibility_prompt_builder()
        
        pipeline = Pipeline()
        pipeline.add_component("prompt_builder", ilo_eligibility_prompt_builder)
        pipeline.add_component("llm", ilo_eligibility_llm)
        pipeline.connect("prompt_builder.prompt", "llm.messages")
        
        return pipeline

    def create_ilo_match_pipeline(self) -> Pipeline:
        """Creates a pipeline for ILO eligibility checking."""
        ilo_match_model = os.getenv('CLASSIFIER_ILO_ELIGIBILITY_MODEL', os.getenv('CLASSIFIER_MODEL'))
        ilo_match_llm = OpenRouterChatGenerator(model=ilo_match_model)
        ilo_match_prompt_builder = self.setup_ilo_match_prompt_builder()

        pipeline = Pipeline()
        pipeline.add_component("prompt_builder", ilo_match_prompt_builder)
        pipeline.add_component("llm", ilo_match_llm)
        pipeline.connect("prompt_builder.prompt", "llm.messages")

        return pipeline

    def parse_json_from_reply(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Helper to extract JSON from LLM string output"""
        try:
            start_index = response_text.find('{')
            end_index = response_text.rfind('}')
            if start_index == -1 or end_index == -1:
                return None
            return json.loads(response_text[start_index : end_index + 1])
        except json.JSONDecodeError:
            return None