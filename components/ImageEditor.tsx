import React, { useRef, useEffect, useState, MouseEvent as ReactMouseEvent, WheelEvent, useCallback, useLayoutEffect, TouchEvent as ReactTouchEvent } from 'react';
import { dataUrlToFile } from '../utils/fileUtils';
import { useI18n } from '../hooks/useI18n';
import { Button } from './Button';
import { ResetIcon } from './icons';

interface ImageEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

type MaskTool = 'brush' | 'rectangle';

export const ImageEditor: React.FC<ImageEditorProps> = ({ file, onSave, onCancel }) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [maskTool, setMaskTool] = useState<MaskTool>('rectangle');
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [resetCount, setResetCount] = useState(0);

  // Viewport state
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState({ scale: 1, x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Effect 1: Load the image from the file prop into an HTMLImageElement
  useEffect(() => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      setImage(img);
    };
    img.onerror = () => {
      console.error("Failed to load image for editing.");
      onCancel();
    };

    return () => {
      URL.revokeObjectURL(objectUrl);
      setImage(null);
    };
  }, [file, onCancel]);

  // Effect 2: Set up ResizeObserver to calculate initial view and handle resizing
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!image || !canvas || !container) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const observer = new ResizeObserver(entries => {
      if (entries.length === 0) return;
      const { width: cw, height: ch } = entries[0].contentRect;

      if (cw === 0 || ch === 0) {
        return;
      }

      const { naturalWidth: iw, naturalHeight: ih } = image;

      const scaleX = cw / iw;
      const scaleY = ch / ih;
      const initialScale = Math.min(scaleX, scaleY, 1);
      const initialX = (cw - iw * initialScale) / 2;
      const initialY = (ch - ih * initialScale) / 2;

      const newTransform = { scale: initialScale, x: initialX, y: initialY };
      setTransform(newTransform);
      setInitialTransform(newTransform);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [image]);


  // Effect 3: Main drawing logic.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!image || !context || !canvas || transform.scale === 0) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

  }, [image, resetCount, transform, initialTransform]); // Redraw when these change

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);
  
  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    
    setIsDrawing(true);
    if (maskTool === 'brush') {
      context.beginPath();
      context.moveTo(coords.x, coords.y);
    } else {
      setStartPos(coords);
      setSnapshot(context.getImageData(0, 0, context.canvas.width, context.canvas.height));
    }
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const context = canvasRef.current?.getContext('2d');

    if (isDrawing && context && coords) {
        if (maskTool === 'brush') {
          context.lineTo(coords.x, coords.y);
          context.strokeStyle = 'white';
          context.lineWidth = brushSize;
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.stroke();
        } else if (snapshot && startPos) {
          context.putImageData(snapshot, 0, 0);
          const width = coords.x - startPos.x;
          const height = coords.y - startPos.y;
          context.fillStyle = 'rgba(255, 255, 255, 0.7)';
          context.fillRect(startPos.x, startPos.y, width, height);
        }
    }
  };

  const handleMouseUp = (e: ReactMouseEvent<HTMLDivElement>) => {
    const context = canvasRef.current?.getContext('2d');
    if (isDrawing && context) {
      if (maskTool === 'brush') {
        context.closePath();
      } else if (snapshot && startPos) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        if(coords) {
          context.putImageData(snapshot, 0, 0);
          const width = coords.x - startPos.x;
          const height = coords.y - startPos.y;
          context.fillStyle = 'white';
          context.fillRect(startPos.x, startPos.y, width, height);
        }
      }
    }
    setIsDrawing(false);
    setStartPos(null);
    setSnapshot(null);
  };
  
  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const coords = getCanvasCoords(touch.clientX, touch.clientY);
        if (!coords) return;
        const context = canvasRef.current?.getContext('2d');
        if (!context) return;

        setIsDrawing(true);
        if (maskTool === 'brush') {
          context.beginPath();
          context.moveTo(coords.x, coords.y);
        } else {
          setStartPos(coords);
          setSnapshot(context.getImageData(0, 0, context.canvas.width, context.canvas.height));
        }
    } else if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        lastPinchDist.current = dist;
    }
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const coords = getCanvasCoords(touch.clientX, touch.clientY);
        const context = canvasRef.current?.getContext('2d');

        if (isDrawing && context && coords) {
            if (maskTool === 'brush') {
              context.lineTo(coords.x, coords.y);
              context.strokeStyle = 'white';
              context.lineWidth = brushSize;
              context.lineCap = 'round';
              context.lineJoin = 'round';
              context.stroke();
            } else if (snapshot && startPos) {
              context.putImageData(snapshot, 0, 0);
              const width = coords.x - startPos.x;
              const height = coords.y - startPos.y;
              context.fillStyle = 'rgba(255, 255, 255, 0.7)';
              context.fillRect(startPos.x, startPos.y, width, height);
            }
        }
    }
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const context = canvasRef.current?.getContext('2d');
    if (isDrawing && context && startPos) {
      if (maskTool === 'brush') {
        context.closePath();
      } else if (snapshot) {
        const touch = e.changedTouches[0];
        const coords = getCanvasCoords(touch.clientX, touch.clientY);
        if (coords) {
          context.putImageData(snapshot, 0, 0);
          const width = coords.x - startPos.x;
          const height = coords.y - startPos.y;
          context.fillStyle = 'white';
          context.fillRect(startPos.x, startPos.y, width, height);
        }
      }
    }
    
    setIsDrawing(false);
    setStartPos(null);
    setSnapshot(null);
    lastPinchDist.current = null;
  };
  
  const handleResetView = () => setTransform(initialTransform);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    onSave(dataUrlToFile(canvas.toDataURL(file.type, 0.95), file.name));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('imageEditor.title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('imageEditor.description.mask')}</p>
            </div>
        </div>
        <div 
          ref={containerRef}
          className="relative flex-grow bg-gray-100 dark:bg-gray-900 overflow-hidden min-h-0"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
            <canvas
                ref={canvasRef}
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transformOrigin: 'top left',
                }}
            />
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow-md">
                <button onClick={handleResetView} title={t('imageEditor.resetView')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><ResetIcon className="w-5 h-5" /></button>
            </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:grid sm:grid-cols-3 sm:items-center gap-4">
            <div className="flex justify-center sm:justify-start items-center gap-4">
                <div className="flex bg-gray-200 dark:bg-gray-900 rounded-lg p-1">
                  <button 
                    onClick={() => setMaskTool('rectangle')}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${maskTool === 'rectangle' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                  >{t('imageEditor.rectangle')}</button>
                  <button 
                    onClick={() => setMaskTool('brush')}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${maskTool === 'brush' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                  >{t('imageEditor.brush')}</button>
                </div>
            </div>
            
            <div className="flex justify-center w-full">
                {maskTool === 'brush' && (
                  <div className="flex items-center gap-3 w-full max-w-xs">
                      <label htmlFor="brushSize" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('imageEditor.brushSize')}</label>
                      <input id="brushSize" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full" />
                  </div>
                )}
            </div>

            <div className="flex justify-center sm:justify-end items-center gap-2">
                <Button variant="secondary" onClick={() => setResetCount(c => c + 1)}>{t('button.reset')}</Button>
                <Button variant="destructive" onClick={onCancel}>{t('button.cancel')}</Button>
                <Button variant="primary" onClick={handleSave}>{t('button.save')}</Button>
            </div>
        </div>
      </div>
    </div>
  );
};