/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface ElementLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface LayoutState {
  tag: ElementLayout;
  title: ElementLayout;
  desc: ElementLayout;
  footer: ElementLayout;
  qr: ElementLayout;
  qrLabel: ElementLayout;
}

interface UploadedImage {
  id: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CouponData {
  link: string;
  qrUrl: string;
}

type TargetType = 'key' | 'img';

export default function App() {
  // 1. Text states
  const [couponTag, setCouponTag] = useState<string>('CUPÓN EXCLUSIVO');
  const [couponTitle, setCouponTitle] = useState<string>('¡Descarga nuestra App en Google Play!');
  const [couponDesc, setCouponDesc] = useState<string>(
    'Escanea este código QR con la cámara de tu teléfono móvil para descargar la aplicación inmediatamente.'
  );
  const [couponFooter, setCouponFooter] = useState<string>(
    'Válido en Android. Promoción por tiempo limitado.'
  );
  const [qrLabelText, setQrLabelText] = useState<string>('Escanear aquí');

  // 2. Images state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const nextImgIdRef = useRef<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. Links state
  const [linksInput, setLinksInput] = useState<string>(
    'https://play.google.com/store/apps/details?id=com.ejemplo.app1\nhttps://play.google.com/store/apps/details?id=com.ejemplo.app2\nhttps://play.google.com/store/apps/details?id=com.ejemplo.app3'
  );

  // Layout state for shared element positions
  const [layoutState, setLayoutState] = useState<LayoutState>({
    tag: { left: 24, top: 16, width: 160, height: 26 },
    title: { left: 24, top: 46, width: 440, height: 38 },
    desc: { left: 24, top: 90, width: 440, height: 50 },
    footer: { left: 24, top: 236, width: 440, height: 24 },
    qr: { left: 520, top: 30, width: 140, height: 140 },
    qrLabel: { left: 520, top: 178, width: 140, height: 24 },
  });

  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [isPrintVisible, setIsPrintVisible] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Refs for drag and resize interactions
  const interactionRef = useRef<{
    active: boolean;
    type: TargetType;
    id: string;
    isResizing: boolean;
    startX: number;
    startY: number;
    initialLeft: number;
    initialTop: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  // Keep state accessible in event listeners
  const layoutStateRef = useRef(layoutState);
  layoutStateRef.current = layoutState;

  const uploadedImagesRef = useRef(uploadedImages);
  uploadedImagesRef.current = uploadedImages;

  // Generate coupons helper
  const generateCouponList = async (text: string) => {
    const links = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (links.length === 0) {
      setErrorMessage('Pega al menos un enlace en el cuadro de texto.');
      return;
    }

    setErrorMessage(null);

    const generated: CouponData[] = await Promise.all(
      links.map(async (link) => {
        try {
          const url = await QRCode.toDataURL(link, {
            width: 300,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          return { link, qrUrl: url };
        } catch {
          const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
            link
          )}`;
          return { link, qrUrl: fallbackUrl };
        }
      })
    );

    setCoupons(generated);
    setIsPrintVisible(true);
  };

  // Generate initial coupons on component mount
  useEffect(() => {
    generateCouponList(linksInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle multi-image upload
  const handleMultipleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    if (files.length === 0) return;

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const src = evt.target?.result as string;
        if (!src) return;

        setUploadedImages((prev) => {
          const newImg: UploadedImage = {
            id: 'custom_img_' + nextImgIdRef.current++,
            src,
            left: 24 + prev.length * 20,
            top: 150,
            width: 70,
            height: 70,
          };
          return [...prev, newImg];
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove uploaded image
  const removeImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Start drag or resize handler
  const startInteraction = (
    clientX: number,
    clientY: number,
    type: TargetType,
    id: string,
    isResizing: boolean
  ) => {
    let initLeft = 0;
    let initTop = 0;
    let initWidth = 0;
    let initHeight = 0;

    if (type === 'key') {
      const key = id as keyof LayoutState;
      const item = layoutStateRef.current[key];
      if (item) {
        initLeft = item.left;
        initTop = item.top;
        initWidth = item.width;
        initHeight = item.height;
      }
    } else {
      const found = uploadedImagesRef.current.find((img) => img.id === id);
      if (found) {
        initLeft = found.left;
        initTop = found.top;
        initWidth = found.width;
        initHeight = found.height;
      }
    }

    interactionRef.current = {
      active: true,
      type,
      id,
      isResizing,
      startX: clientX,
      startY: clientY,
      initialLeft: initLeft,
      initialTop: initTop,
      initialWidth: initWidth,
      initialHeight: initHeight,
    };

    setActiveItemId(id);
  };

  // Global mousemove and mouseup handlers
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      const current = interactionRef.current;
      if (!current || !current.active) return;

      const dx = clientX - current.startX;
      const dy = clientY - current.startY;

      if (current.isResizing) {
        const newW = Math.max(30, Math.round(current.initialWidth + dx));
        const newH = Math.max(20, Math.round(current.initialHeight + dy));

        if (current.type === 'key') {
          const key = current.id as keyof LayoutState;
          setLayoutState((prev) => ({
            ...prev,
            [key]: {
              ...prev[key],
              width: newW,
              height: newH,
            },
          }));
        } else {
          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === current.id ? { ...img, width: newW, height: newH } : img
            )
          );
        }
      } else {
        const newL = Math.round(current.initialLeft + dx);
        const newT = Math.round(current.initialTop + dy);

        if (current.type === 'key') {
          const key = current.id as keyof LayoutState;
          setLayoutState((prev) => ({
            ...prev,
            [key]: {
              ...prev[key],
              left: newL,
              top: newT,
            },
          }));
        } else {
          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === current.id ? { ...img, left: newL, top: newT } : img
            )
          );
        }
      }
    };

    const handleEnd = () => {
      if (interactionRef.current) {
        interactionRef.current = null;
        setActiveItemId(null);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handleEnd();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const handleGenerateClick = () => {
    generateCouponList(linksInput);
    setTimeout(() => {
      printAreaRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Chunk coupons into sheets of 3
  const sheets: CouponData[][] = [];
  for (let i = 0; i < coupons.length; i += 3) {
    sheets.push(coupons.slice(i, i + 3));
  }

  return (
    <div>
      <div className="controls">
        <h1 id="appHeaderTitle">Editor y Generador Visual de Cuponeras</h1>
        <p>
          <strong>Arrastra y redimensiona</strong> cualquier texto, QR o imagen en el primer cupón
          (cupón maestro). Todas las hojas se ajustarán automáticamente a ese diseño exacto.
        </p>

        {errorMessage && (
          <div
            id="errorMessageBanner"
            style={{
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '0.9rem',
              fontWeight: 600,
              border: '1px solid #f87171',
            }}
          >
            {errorMessage}
          </div>
        )}

        <div className="section-title">1. Textos del Cupón</div>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="couponTag">Etiqueta / Badge</label>
            <input
              type="text"
              id="couponTag"
              value={couponTag}
              onChange={(e) => setCouponTag(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="couponTitle">Título del Cupón</label>
            <input
              type="text"
              id="couponTitle"
              value={couponTitle}
              onChange={(e) => setCouponTitle(e.target.value)}
            />
          </div>
          <div className="form-group full">
            <label htmlFor="couponDesc">Descripción / Instrucciones</label>
            <input
              type="text"
              id="couponDesc"
              value={couponDesc}
              onChange={(e) => setCouponDesc(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="couponFooter">Términos o Pie</label>
            <input
              type="text"
              id="couponFooter"
              value={couponFooter}
              onChange={(e) => setCouponFooter(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="qrLabelText">Texto bajo el QR</label>
            <input
              type="text"
              id="qrLabelText"
              value={qrLabelText}
              onChange={(e) => setQrLabelText(e.target.value)}
            />
          </div>
        </div>

        <div className="section-title">2. Imágenes del Cupón (puedes subir varias)</div>
        <div className="form-group full">
          <input
            type="file"
            id="imageUpload"
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleMultipleImages}
          />
          <div className="images-preview-bar" id="imagesBar">
            {uploadedImages.map((img) => (
              <div key={img.id} className="image-thumb" id={`thumb-${img.id}`}>
                <img src={img.src} alt="Thumb" />
                <button
                  type="button"
                  className="btn-del"
                  onClick={() => removeImage(img.id)}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="section-title">3. Enlaces de Google Play</div>
        <div className="form-group full">
          <label htmlFor="linksInput">Pega tu lista de enlaces (uno por línea)</label>
          <textarea
            id="linksInput"
            value={linksInput}
            onChange={(e) => setLinksInput(e.target.value)}
            placeholder="https://play.google.com/store/apps/details?id=com.ejemplo.app1&#10;https://play.google.com/store/apps/details?id=com.ejemplo.app2&#10;https://play.google.com/store/apps/details?id=com.ejemplo.app3"
          />
        </div>

        <div className="actions">
          <button type="button" className="btn-generate" id="btnGenerate" onClick={handleGenerateClick}>
            Generar Cupones
          </button>
          {isPrintVisible && (
            <button
              type="button"
              className="btn-print"
              id="btnPrint"
              onClick={() => window.print()}
              style={{ display: 'inline-block' }}
            >
              Imprimir / Guardar en PDF
            </button>
          )}
        </div>
      </div>

      <div className="print-area" id="printArea" ref={printAreaRef}>
        {sheets.map((sheetCoupons, sheetIdx) => (
          <div key={sheetIdx} className="sheet" id={`sheet-${sheetIdx}`}>
            {sheetCoupons.map((coupon, couponIdx) => {
              const globalIndex = sheetIdx * 3 + couponIdx;
              const isMaster = globalIndex === 0;

              return (
                <div
                  key={coupon.link + globalIndex}
                  id={`coupon-${globalIndex}`}
                  className={`coupon ${isMaster ? 'master-coupon' : ''}`}
                  data-index={globalIndex}
                  data-link={coupon.link}
                >
                  {/* Tag */}
                  <div
                    className={`draggable-item ${activeItemId === 'tag' && isMaster ? 'active' : ''}`}
                    data-key="tag"
                    style={{
                      left: `${layoutState.tag.left}px`,
                      top: `${layoutState.tag.top}px`,
                      width: `${layoutState.tag.width}px`,
                      height: `${layoutState.tag.height}px`,
                    }}
                    onMouseDown={(e) => {
                      if (!isMaster) return;
                      e.preventDefault();
                      startInteraction(e.clientX, e.clientY, 'key', 'tag', false);
                    }}
                    onTouchStart={(e) => {
                      if (!isMaster || e.touches.length === 0) return;
                      startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'tag', false);
                    }}
                  >
                    <div className="item-text">
                      <span className="item-tag">{couponTag}</span>
                    </div>
                    {isMaster && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startInteraction(e.clientX, e.clientY, 'key', 'tag', true);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (e.touches.length === 0) return;
                          startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'tag', true);
                        }}
                      />
                    )}
                  </div>

                  {/* Título */}
                  <div
                    className={`draggable-item ${activeItemId === 'title' && isMaster ? 'active' : ''}`}
                    data-key="title"
                    style={{
                      left: `${layoutState.title.left}px`,
                      top: `${layoutState.title.top}px`,
                      width: `${layoutState.title.width}px`,
                      height: `${layoutState.title.height}px`,
                    }}
                    onMouseDown={(e) => {
                      if (!isMaster) return;
                      e.preventDefault();
                      startInteraction(e.clientX, e.clientY, 'key', 'title', false);
                    }}
                    onTouchStart={(e) => {
                      if (!isMaster || e.touches.length === 0) return;
                      startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'title', false);
                    }}
                  >
                    <div className="item-text item-title">{couponTitle}</div>
                    {isMaster && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startInteraction(e.clientX, e.clientY, 'key', 'title', true);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (e.touches.length === 0) return;
                          startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'title', true);
                        }}
                      />
                    )}
                  </div>

                  {/* Descripción */}
                  <div
                    className={`draggable-item ${activeItemId === 'desc' && isMaster ? 'active' : ''}`}
                    data-key="desc"
                    style={{
                      left: `${layoutState.desc.left}px`,
                      top: `${layoutState.desc.top}px`,
                      width: `${layoutState.desc.width}px`,
                      height: `${layoutState.desc.height}px`,
                    }}
                    onMouseDown={(e) => {
                      if (!isMaster) return;
                      e.preventDefault();
                      startInteraction(e.clientX, e.clientY, 'key', 'desc', false);
                    }}
                    onTouchStart={(e) => {
                      if (!isMaster || e.touches.length === 0) return;
                      startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'desc', false);
                    }}
                  >
                    <div className="item-text item-desc">{couponDesc}</div>
                    {isMaster && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startInteraction(e.clientX, e.clientY, 'key', 'desc', true);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (e.touches.length === 0) return;
                          startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'desc', true);
                        }}
                      />
                    )}
                  </div>

                  {/* Footer */}
                  <div
                    className={`draggable-item ${activeItemId === 'footer' && isMaster ? 'active' : ''}`}
                    data-key="footer"
                    style={{
                      left: `${layoutState.footer.left}px`,
                      top: `${layoutState.footer.top}px`,
                      width: `${layoutState.footer.width}px`,
                      height: `${layoutState.footer.height}px`,
                    }}
                    onMouseDown={(e) => {
                      if (!isMaster) return;
                      e.preventDefault();
                      startInteraction(e.clientX, e.clientY, 'key', 'footer', false);
                    }}
                    onTouchStart={(e) => {
                      if (!isMaster || e.touches.length === 0) return;
                      startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'footer', false);
                    }}
                  >
                    <div className="item-text item-footer">{couponFooter}</div>
                    {isMaster && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startInteraction(e.clientX, e.clientY, 'key', 'footer', true);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (e.touches.length === 0) return;
                          startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'footer', true);
                        }}
                      />
                    )}
                  </div>

                  {/* Imágenes Personalizadas */}
                  {uploadedImages.map((img) => (
                    <div
                      key={img.id}
                      className={`draggable-item ${activeItemId === img.id && isMaster ? 'active' : ''}`}
                      data-imgid={img.id}
                      style={{
                        left: `${img.left}px`,
                        top: `${img.top}px`,
                        width: `${img.width}px`,
                        height: `${img.height}px`,
                      }}
                      onMouseDown={(e) => {
                        if (!isMaster) return;
                        e.preventDefault();
                        startInteraction(e.clientX, e.clientY, 'img', img.id, false);
                      }}
                      onTouchStart={(e) => {
                        if (!isMaster || e.touches.length === 0) return;
                        startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'img', img.id, false);
                      }}
                    >
                      <img src={img.src} alt="Imagen cupón" />
                      {isMaster && (
                        <div
                          className="resize-handle"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            startInteraction(e.clientX, e.clientY, 'img', img.id, true);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            if (e.touches.length === 0) return;
                            startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'img', img.id, true);
                          }}
                        />
                      )}
                    </div>
                  ))}

                  {/* QR */}
                  <div
                    className={`draggable-item ${activeItemId === 'qr' && isMaster ? 'active' : ''}`}
                    data-key="qr"
                    style={{
                      left: `${layoutState.qr.left}px`,
                      top: `${layoutState.qr.top}px`,
                      width: `${layoutState.qr.width}px`,
                      height: `${layoutState.qr.height}px`,
                    }}
                    onMouseDown={(e) => {
                      if (!isMaster) return;
                      e.preventDefault();
                      startInteraction(e.clientX, e.clientY, 'key', 'qr', false);
                    }}
                    onTouchStart={(e) => {
                      if (!isMaster || e.touches.length === 0) return;
                      startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'qr', false);
                    }}
                  >
                    <img src={coupon.qrUrl} alt="QR" />
                    {isMaster && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startInteraction(e.clientX, e.clientY, 'key', 'qr', true);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (e.touches.length === 0) return;
                          startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'qr', true);
                        }}
                      />
                    )}
                  </div>

                  {/* Texto bajo el QR */}
                  <div
                    className={`draggable-item ${activeItemId === 'qrLabel' && isMaster ? 'active' : ''}`}
                    data-key="qrLabel"
                    style={{
                      left: `${layoutState.qrLabel.left}px`,
                      top: `${layoutState.qrLabel.top}px`,
                      width: `${layoutState.qrLabel.width}px`,
                      height: `${layoutState.qrLabel.height}px`,
                    }}
                    onMouseDown={(e) => {
                      if (!isMaster) return;
                      e.preventDefault();
                      startInteraction(e.clientX, e.clientY, 'key', 'qrLabel', false);
                    }}
                    onTouchStart={(e) => {
                      if (!isMaster || e.touches.length === 0) return;
                      startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'qrLabel', false);
                    }}
                  >
                    <div className="item-text item-qr-label">{qrLabelText}</div>
                    {isMaster && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startInteraction(e.clientX, e.clientY, 'key', 'qrLabel', true);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (e.touches.length === 0) return;
                          startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'key', 'qrLabel', true);
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
