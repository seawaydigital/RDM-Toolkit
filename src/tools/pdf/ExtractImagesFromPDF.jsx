import { useState, useCallback } from 'react';
import { OPS } from 'pdfjs-dist';
import JSZip from 'jszip';
import InfoCard from '../../components/ui/InfoCard';
import DropZone from '../../components/ui/DropZone';
import ActionButton from '../../components/ui/ActionButton';
import ResultPanel from '../../components/ui/ResultPanel';
import ErrorCard from '../../components/ui/ErrorCard';
import EncryptedPDFError from '../../components/ui/EncryptedPDFError';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { PDF_VALIDATION, validatePDFHeader, formatFileSize } from '../../utils/fileValidation';
import { buildOutputFilename } from '../../utils/filename';
import { renderAllThumbnails, loadPdfDocument } from '../../utils/pdfThumbnails';

export default function ExtractImagesFromPDF({ tool, navigateTo }) {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [encryptedError, setEncryptedError] = useState(false);
  const [result, setResult] = useState(null);
  const [extractedPreviews, setExtractedPreviews] = useState([]);
  const [imageCount, setImageCount] = useState(null);
  const [thumbSize, setThumbSize] = useState(160);

  const handleFileSelected = useCallback(async ([selectedFile]) => {
    setError(null);
    setEncryptedError(false);
    setResult(null);
    setThumbnails([]);
    setPageCount(0);
    setExtractedPreviews([]);
    setImageCount(null);

    const isValid = await validatePDFHeader(selectedFile);
    if (!isValid) {
      setError('This file does not appear to be a valid PDF.');
      return;
    }

    setFile(selectedFile);

    try {
      const bytes = await selectedFile.arrayBuffer();
      const uint8 = new Uint8Array(bytes).slice();
      setFileBytes(uint8);

      let pdfJsDoc;
      try {
        pdfJsDoc = await loadPdfDocument(uint8.slice());
      } catch (e) {
        if (
          e.message &&
          (e.message.includes('encrypted') || e.message.includes('password'))
        ) {
          setEncryptedError(true);
          return;
        }
        throw e;
      }

      setPageCount(pdfJsDoc.numPages);

      renderAllThumbnails(pdfJsDoc, (pageNum, dataUrl) => {
        setThumbnails((prev) => {
          const next = [...prev];
          next[pageNum - 1] = dataUrl;
          return next;
        });
      });
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Failed to read the PDF. The file may be corrupted.');
    }
  }, []);

  const handleExtract = useCallback(async () => {
    if (!fileBytes) return;
    setLoading(true);
    setError(null);
    setExtractedPreviews([]);
    setImageCount(null);

    try {
      let pdfJsDoc;
      try {
        pdfJsDoc = await loadPdfDocument(fileBytes);
      } catch (e) {
        if (
          e.message &&
          (e.message.includes('encrypted') || e.message.includes('password'))
        ) {
          setEncryptedError(true);
          setLoading(false);
          return;
        }
        throw e;
      }

      const zip = new JSZip();
      const previews = [];
      let totalImages = 0;

      for (let i = 1; i <= pdfJsDoc.numPages; i++) {
        const page = await pdfJsDoc.getPage(i);
        const operatorList = await page.getOperatorList();

        for (let j = 0; j < operatorList.fnArray.length; j++) {
          const fn = operatorList.fnArray[j];

          if (
            fn === OPS.paintImageXObject ||
            fn === OPS.paintJpegImageXObject
          ) {
            const imageName = operatorList.argsArray[j][0];

            try {
              const imgData = await new Promise((resolve, reject) => {
                page.objs.get(imageName, (data) => {
                  if (data) resolve(data);
                  else reject(new Error('Image object not found'));
                });
              });

              // Skip very small images (likely artifacts or masks)
              if (imgData.width < 10 || imgData.height < 10) continue;

              totalImages++;
              const imgIndex = totalImages;

              const canvas = document.createElement('canvas');
              canvas.width = imgData.width;
              canvas.height = imgData.height;
              const ctx = canvas.getContext('2d');

              // Handle different image data formats
              let imageDataObj;
              if (imgData.data instanceof Uint8ClampedArray) {
                // RGBA data
                if (imgData.data.length === imgData.width * imgData.height * 4) {
                  imageDataObj = new ImageData(imgData.data, imgData.width, imgData.height);
                } else if (imgData.data.length === imgData.width * imgData.height * 3) {
                  // RGB data - convert to RGBA
                  const rgba = new Uint8ClampedArray(imgData.width * imgData.height * 4);
                  for (let k = 0; k < imgData.width * imgData.height; k++) {
                    rgba[k * 4] = imgData.data[k * 3];
                    rgba[k * 4 + 1] = imgData.data[k * 3 + 1];
                    rgba[k * 4 + 2] = imgData.data[k * 3 + 2];
                    rgba[k * 4 + 3] = 255;
                  }
                  imageDataObj = new ImageData(rgba, imgData.width, imgData.height);
                } else {
                  // Grayscale or other format
                  const rgba = new Uint8ClampedArray(imgData.width * imgData.height * 4);
                  const bytesPerPixel = imgData.data.length / (imgData.width * imgData.height);
                  for (let k = 0; k < imgData.width * imgData.height; k++) {
                    const val = imgData.data[Math.floor(k * bytesPerPixel)];
                    rgba[k * 4] = val;
                    rgba[k * 4 + 1] = val;
                    rgba[k * 4 + 2] = val;
                    rgba[k * 4 + 3] = 255;
                  }
                  imageDataObj = new ImageData(rgba, imgData.width, imgData.height);
                }
                ctx.putImageData(imageDataObj, 0, 0);
              } else if (imgData.src) {
                // It's an HTMLImageElement or similar with a src
                ctx.drawImage(imgData, 0, 0);
              } else if (imgData instanceof HTMLCanvasElement) {
                ctx.drawImage(imgData, 0, 0);
              } else if (imgData.bitmap) {
                ctx.drawImage(imgData.bitmap, 0, 0);
              } else {
                // Skip unsupported format
                canvas.remove();
                totalImages--;
                continue;
              }

              const blob = await new Promise((resolve) =>
                canvas.toBlob(resolve, 'image/png')
              );

              if (blob) {
                const filename = `page${i}_image${imgIndex}.png`;
                zip.file(filename, blob);

                // Keep a preview for the first 20 images
                if (previews.length < 20) {
                  previews.push(canvas.toDataURL('image/png'));
                }
              }

              canvas.remove();
            } catch (e) {
              console.error('Image extraction failed:', e);
              // Skip images that fail to extract
            }
          }
        }

        page.cleanup();
      }

      pdfJsDoc.destroy();

      if (totalImages === 0) {
        setError('No extractable images were found in this PDF.');
        setLoading(false);
        return;
      }

      setImageCount(totalImages);
      setExtractedPreviews(previews);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const filename = buildOutputFilename(file.name, 'images-extracted', 'zip');

      setResult({
        filename,
        originalSize: file.size,
        resultSize: zipBlob.size,
        downloadUrl: url,
      });
    } catch (e) {
      console.error('Image extraction failed:', e);
      setError('Something went wrong during image extraction. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fileBytes, file]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setFileBytes(null);
    setThumbnails([]);
    setPageCount(0);
    setError(null);
    setEncryptedError(false);
    setExtractedPreviews([]);
    setImageCount(null);
  }, []);

  const handleStartOver = useCallback(() => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setFileBytes(null);
    setThumbnails([]);
    setPageCount(0);
    setLoading(false);
    setError(null);
    setEncryptedError(false);
    setResult(null);
    setExtractedPreviews([]);
    setImageCount(null);
  }, [result]);

  if (result) {
    return (
      <div>
        <InfoCard description="Pulls all embedded images out of a PDF and packages them as a downloadable ZIP. Extraction runs entirely in your browser." />

        {imageCount != null && (
          <p className="extract-summary">
            Found {imageCount} image{imageCount !== 1 ? 's' : ''} across {pageCount} page
            {pageCount !== 1 ? 's' : ''}.
          </p>
        )}

        {extractedPreviews.length > 0 && (
          <div className="thumbnail-grid extracted-image-grid">
            {extractedPreviews.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Extracted image ${i + 1}`}
                className="thumbnail-image"
              />
            ))}
          </div>
        )}

        <ResultPanel
          filename={result.filename}
          originalSize={result.originalSize}
          resultSize={result.resultSize}
          downloadUrl={result.downloadUrl}
          onStartOver={handleStartOver}
        />
      </div>
    );
  }

  return (
    <div>
      <InfoCard description="Pulls all embedded images out of a PDF and packages them as a downloadable ZIP. Extraction runs entirely in your browser." />

      {encryptedError ? (
        <EncryptedPDFError onNavigate={navigateTo} />
      ) : error ? (
        <ErrorCard title="Error" message={error} />
      ) : null}

      {!file && !encryptedError && (
        <DropZone
          accept=".pdf"
          validationConfig={PDF_VALIDATION}
          onFilesSelected={handleFileSelected}
          label="Drop a PDF here or click to browse"
          sublabel={formatFileSize(PDF_VALIDATION.blockSize) + ' max'}
        />
      )}

      {file && !encryptedError && (
        <div className="tool-file-preview">
          <span className="tool-file-name">{file.name}</span>
          <button className="tool-file-remove" onClick={handleRemoveFile} aria-label="Remove file">
            <X size={14} />
            Remove
          </button>
        </div>
      )}

      {thumbnails.length > 0 && (
        <>
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.max(80, s - 40))} disabled={thumbSize <= 80} aria-label="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-label">{thumbSize}px</span>
            <button className="zoom-btn" onClick={() => setThumbSize(s => Math.min(300, s + 40))} disabled={thumbSize >= 300} aria-label="Zoom in">
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="thumbnail-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}>
            {thumbnails.map((src, i) =>
            src ? (
              <img
                key={i}
                src={src}
                alt={`Page ${i + 1}`}
                className="thumbnail-image"
              />
            ) : (
              <div key={i} className="thumbnail-placeholder" />
            )
          )}
          </div>
        </>
      )}

      {file && !encryptedError && (
        <ActionButton
          label={`Extract Images from ${pageCount} Page${pageCount !== 1 ? 's' : ''}`}
          onClick={handleExtract}
          disabled={!fileBytes}
          loading={loading}
        />
      )}
    </div>
  );
}
