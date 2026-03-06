"use client";

import {
  AlertCircleIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  Trash2Icon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";

import {
  formatBytes,
  useFileUpload,
} from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

const getFileIcon = (file: { file: File | { type: string; name: string } }) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type;
  const fileName = file.file instanceof File ? file.file.name : file.file.name;

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />;
  }
  if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar") ||
    fileName.endsWith(".7z")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />;
  }
  if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".csv")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />;
  }
  if (fileType.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />;
  }
  if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />;
  }
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />;
  }
  return <FileIcon className="size-4 opacity-60" />;
};

interface FileUploaderProps {
  onChange: (files: File[]) => void;
}

export default function FileUploader({ onChange }: FileUploaderProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp.fileUploader' });

  // 1GB limit with 5MB buffer for safety
  const maxTotalSize = (1024 * 1024 * 1024) - (5 * 1024 * 1024);
  const onChangeRef = useRef(onChange);

  const [
    { files, isDragging, errors: hookErrors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    maxSize: maxTotalSize,
    maxFiles: Infinity,
    multiple: true,
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
  });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const rawFiles = files.map((file) => file.file as File);
    onChange(rawFiles);
  }, [files]);

  // Calculate total size of all uploaded files
  const totalSize = useMemo(() => {
    return files.reduce((acc, file) => {
      const size = file.file instanceof File ? file.file.size : file.file.size;
      return acc + size;
    }, 0);
  }, [files]);

  const isOverTotalLimit = totalSize > maxTotalSize;

  const allErrors = [...hookErrors];
  if (isOverTotalLimit) {
    allErrors.push(t('errors.totalSizeExceeded', { size: formatBytes(maxTotalSize) }));
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex min-h-56 flex-col items-center not-data-[files]:justify-center rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50 ${
          isOverTotalLimit ? "border-destructive/50 bg-destructive/5" : ""
        }`}
        data-dragging={isDragging || undefined}
        data-files={files.length > 0 || undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          {...getInputProps()}
          aria-label={t('uploadLabel')}
          className="sr-only"
        />

        {files.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <h3 className="truncate font-medium text-sm">
                  {t('uploadedFiles', { count: files.length })}
                </h3>
                <span className={`text-xs ${isOverTotalLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {formatBytes(totalSize)} / {formatBytes(maxTotalSize)}
                </span>
              </div>
              <Button onClick={clearFiles} size="sm" variant="outline">
                <Trash2Icon
                  aria-hidden="true"
                  className="-ms-0.5 size-3.5 opacity-60"
                />
                {t('removeAll')}
              </Button>
            </div>
            <div className="w-full space-y-2">
              {files.map((file) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 pe-3 min-w-0"
                  key={file.id}
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                    <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border">
                      {getFileIcon(file)}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5 flex-1">
                      <p className="truncate font-medium text-[13px]">
                        {file.file instanceof File
                          ? file.file.name
                          : file.file.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatBytes(
                          file.file instanceof File
                            ? file.file.size
                            : file.file.size,
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    aria-label={t('removeFile')}
                    className="-me-2 size-8 text-muted-foreground/80 hover:bg-transparent hover:text-foreground shrink-0"
                    onClick={() => removeFile(file.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <XIcon aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              ))}

              <Button
                className="mt-2 w-full"
                onClick={openFileDialog}
                variant={isOverTotalLimit ? "destructive" : "outline"}
              >
                <UploadIcon aria-hidden="true" className="-ms-1 opacity-60" />
                {t('addMore')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <div
              aria-hidden="true"
              className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
            >
              <FileIcon className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 font-medium text-sm">{t('uploadTitle')}</p>
            <p className="text-muted-foreground text-xs">
              {t('helperText', { maxSize: formatBytes(maxTotalSize) })}
            </p>
            <Button className="mt-4" onClick={openFileDialog} variant="outline">
              <UploadIcon aria-hidden="true" className="-ms-1 opacity-60" />
              {t('selectFiles')}
            </Button>
          </div>
        )}
      </div>

      {allErrors.length > 0 && (
        <div
          className="flex items-center gap-1 text-destructive text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{allErrors[0]}</span>
        </div>
      )}
    </div>
  );
}