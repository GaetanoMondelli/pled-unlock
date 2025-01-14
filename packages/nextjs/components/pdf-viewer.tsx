"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Document, Page, pdfjs } from "react-pdf";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string;
}

export default function PDFViewer({ pdfUrl }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [textBoxes, setTextBoxes] = useState<Array<{ x: number; y: number; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setError("Failed to load the PDF. Please check the URL and try again.");
  };

  const addTextBox = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    setTextBoxes(prevTextBoxes => [...prevTextBoxes, { x, y, text: "" }]);
  };

  const handleTextChange = (index: number, newText: string) => {
    setTextBoxes(prevTextBoxes => {
      const updatedTextBoxes = [...prevTextBoxes];
      updatedTextBoxes[index].text = newText;
      return updatedTextBoxes;
    });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 space-x-2">
        <Button onClick={() => setScale(prevScale => prevScale + 0.1)}>Zoom In</Button>
        <Button onClick={() => setScale(prevScale => Math.max(0.1, prevScale - 0.1))}>Zoom Out</Button>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div onClick={addTextBox} style={{ position: "relative" }}>
          <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError}>
            <Page pageNumber={pageNumber} scale={scale} />
          </Document>
          {textBoxes.map((box, index) => (
            <Input
              key={index}
              type="text"
              value={box.text}
              onChange={e => handleTextChange(index, e.target.value)}
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: "150px",
              }}
            />
          ))}
        </div>
      )}
      {numPages && (
        <div className="mt-4 space-x-2">
          <Button disabled={pageNumber <= 1} onClick={() => setPageNumber(prevPage => Math.max(1, prevPage - 1))}>
            Previous
          </Button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <Button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(prevPage => Math.min(numPages, prevPage + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
