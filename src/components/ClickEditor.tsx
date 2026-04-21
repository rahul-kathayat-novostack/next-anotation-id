'use client';

import React, { useEffect, useState, useRef } from 'react';
import StyleEditorPanel from './StyleEditorPanel';
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { ArrowBigUp, ArrowUpRight, Code, CornerLeftUp, CornerLeftUpIcon, SendHorizonal } from 'lucide-react';
interface HistoryItem {
    filePath: string;
    line: string;
    column: string;
    value: string; // For text: old text. For style: old className.
    type: 'text' | 'image-src' | 'update-attribute';
    attributeName?: string;
}
export default function ClickEditor(props: any) {
    const [enabled, setEnabled] = useState(false);
    const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
    const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | null>(null);
    const [textValue, setTextValue] = useState('');
    const saveChange = async (filePath: string, line: string, column: string, newValue: string, type: 'text' | 'image-src' | 'update-attribute', attributeName?: string) => {
        try {
            const res = await fetch('/api/edit-source', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filePath,
                    line,
                    column,
                    newValue,
                    type,
                    attributeName
                })
            });
            if (res.ok) {
                console.log('Saved!');
            } else {
                console.error('Failed to save');
            }
        } catch (err) {
            console.error(err);
        }
    };
    const addToHistory = (item: HistoryItem) => {
        try {
            const currentHistory = JSON.parse(sessionStorage.getItem('editHistory') || '[]');
            currentHistory.push(item);
            sessionStorage.setItem('editHistory', JSON.stringify(currentHistory));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    };
    const popHistory = (): HistoryItem | null => {
        try {
            const currentHistory = JSON.parse(sessionStorage.getItem('editHistory') || '[]');
            if (currentHistory.length === 0) return null;
            const item = currentHistory.pop();
            sessionStorage.setItem('editHistory', JSON.stringify(currentHistory));
            return item;
        } catch (e) {
            console.error("Failed to read history", e);
            return null;
        }
    };

    // Undo logic
    useEffect(() => {
        const handleGlobalKeyDown = async (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                const lastItem = popHistory();
                if (lastItem) {
                    console.log("Undoing change...", lastItem);
                    await saveChange(lastItem.filePath, lastItem.line, lastItem.column, lastItem.value, lastItem.type, lastItem.attributeName);
                    // If we undid a style change, we might want to refresh the selected element's visual state
                    // But since we write to file and Next.js HMR kicks in, it should be fine.
                } else {
                    console.log("Nothing to undo");
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Update overlay position when selected element changes or scrolls
    useEffect(() => {
        if (!selectedElement) {
            setOverlayStyle(null);
            return;
        }
        let rafId: number | null = null;
        const updateOverlay = () => {
            if (!selectedElement) return;
            const rect = selectedElement.getBoundingClientRect();
            setOverlayStyle({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
        };

        // Throttle with requestAnimationFrame to avoid layout thrashing
        const throttledUpdate = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                updateOverlay();
                rafId = null;
            });
        };
        updateOverlay();
        window.addEventListener('resize', throttledUpdate, {
            passive: true
        });
        window.addEventListener('scroll', throttledUpdate, {
            capture: true,
            passive: true
        });
        const observer = new ResizeObserver(throttledUpdate);
        observer.observe(selectedElement);
        return () => {
            window.removeEventListener('resize', throttledUpdate);
            window.removeEventListener('scroll', throttledUpdate, true);
            observer.disconnect();
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [selectedElement]);

    // Click and Double Click handlers
    useEffect(() => {
        if (!enabled) {
            setSelectedElement(null);
            return;
        }
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // 1. Ignore if target is no longer in the DOM (e.g. portal closed)
            if (!target || !target.isConnected) return;

            // 2. Sidebar Safe Zone: Ignore any click in the editor's area (right 400px)
            // even if the element was just removed from the DOM.
            const isSidebarArea = e.clientX > window.innerWidth - 410;
            const isUI = target.closest('[data-editor-ui="true"]') || target.closest('[data-radix-portal]') || target.closest('[data-radix-popper-content-wrapper]');
            if (isSidebarArea || isUI) return;

            // 3. Only handle elements that are explicitly marked as editable
            if (target.getAttribute("data-editable") !== "true") {
                setSelectedElement(null);
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            setSelectedElement(target);
        };
        const handleDoubleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.getAttribute("data-editable") !== "true") return;

            // SECURITY: Do not allow text editing of root elements (html/body)
            // as it would overwrite the entire page structure.
            if (target.tagName === 'HTML' || target.tagName === 'BODY') return;
            e.preventDefault();
            e.stopPropagation();

            // Text editing logic
            if (target.children.length > 0 && target.tagName.toLowerCase() !== 'p' && target.tagName.toLowerCase() !== 'h1' && target.tagName.toLowerCase() !== 'h2' && target.tagName.toLowerCase() !== 'h3' && target.tagName.toLowerCase() !== 'span' && target.tagName.toLowerCase() !== 'div') {
                // Conservative check for containers
                // Allow div/p/h1 etc if they have text.
            }

            // If it's an image, we can't text edit
            if (target.tagName.toLowerCase() === 'img') return;
            const oldValue = target.innerText;
            target.contentEditable = "true";
            target.focus();
            target.style.outline = "none"; // We have our own overlay

            const handleBlur = async () => {
                target.contentEditable = "false";
                const filePath = target.getAttribute('data-source-file');
                const line = target.getAttribute('data-line');
                const column = target.getAttribute('data-col');
                const newValue = target.innerText;
                if (newValue !== oldValue && filePath && line && column) {
                    addToHistory({
                        filePath,
                        line,
                        column,
                        value: oldValue,
                        type: 'text'
                    });
                    await saveChange(filePath, line, column, newValue, 'text');
                }
                target.removeEventListener('blur', handleBlur);
                target.removeEventListener('keydown', handleKeyDown);
            };
            const handleKeyDown = (k: KeyboardEvent) => {
                if (k.key === 'Enter' && !k.shiftKey) {
                    k.preventDefault();
                    target.blur();
                }
                if (k.key === 'Escape') {
                    target.innerText = oldValue;
                    target.blur();
                }
            };
            target.addEventListener('blur', handleBlur);
            target.addEventListener('keydown', handleKeyDown);
        };
        document.addEventListener("click", handleClick, true);
        document.addEventListener("dblclick", handleDoubleClick, true);
        return () => {
            document.removeEventListener("click", handleClick, true);
            document.removeEventListener("dblclick", handleDoubleClick, true);
        };
    }, [enabled]);

    // Resize Logic
    const panelRef = useRef<any>(null);
    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        if (!selectedElement) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = selectedElement.offsetWidth;
        const startHeight = selectedElement.offsetHeight;
        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!selectedElement) return;
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            let newWidth = startWidth;
            let newHeight = startHeight;
            if (direction.includes('e')) newWidth = startWidth + dx;
            if (direction.includes('s')) newHeight = startHeight + dy;

            // Apply visually
            selectedElement.style.width = `${newWidth}px`;
            selectedElement.style.height = `${newHeight}px`;

            // Sync with sidebar
            panelRef.current?.updateDimensions(newWidth, newHeight);
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    const handleStyleUpdate = async (newClassName: string, imageSrc?: string) => {
        if (!selectedElement) return;
        const filePath = selectedElement.getAttribute('data-source-file');
        const line = selectedElement.getAttribute('data-line');
        const column = selectedElement.getAttribute('data-col');

        // Handle className update (includes width/height now)
        if (filePath && line && column) {
            selectedElement.className = newClassName;
            // Clear inline styles once classes are applied
            selectedElement.style.width = '';
            selectedElement.style.height = '';
            await saveChange(filePath, line, column, newClassName, 'update-attribute', 'className');
        }

        // Handle image src update
        if (imageSrc && selectedElement.tagName === 'IMG' && filePath && line && column) {
            const imgElement = selectedElement as HTMLImageElement;
            imgElement.src = imageSrc;
            await saveChange(filePath, line, column, imageSrc, 'image-src');
        }
    };
    const showSidebar = enabled && selectedElement;
    return <>
        <div data-editable="false" className="relative min-h-screen w-full">
            {props.children}
        </div>

        {/* Editor UI Overlay */}
        {enabled && selectedElement && overlayStyle && <div data-editor-ui="true">
            <div data-editor-ui="true" style={{
                position: 'fixed',
                ...overlayStyle,
                pointerEvents: 'none',
                border: '2px solid #3b82f6',
                zIndex: 9999
            }}>
                {/* Resize Handles */}
                {['se', 'e', 's'].map(dir => <div key={dir} onMouseDown={e => handleResizeStart(e, dir)} style={{
                    position: 'absolute',
                    width: '10px',
                    height: '10px',
                    background: 'white',
                    border: '1px solid #3b82f6',
                    pointerEvents: 'auto',
                    cursor: `${dir}-resize`,
                    ...(dir === 'se' ? {
                        bottom: -6,
                        right: -6
                    } : {}),
                    ...(dir === 'e' ? {
                        top: '50%',
                        right: -6,
                        transform: 'translateY(-50%)'
                    } : {}),
                    ...(dir === 's' ? {
                        bottom: -6,
                        left: '50%',
                        transform: 'translateX(-50%)'
                    } : {})
                }} />)}
                {/* Label */}
                <div style={{
                    position: 'absolute',
                    top: -24,
                    left: 0,
                    background: '#3b82f6',
                    color: 'white',
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: '4px 4px 0 0',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                }}>
                    {selectedElement.tagName.toLowerCase()}
                    {selectedElement.id ? `#${selectedElement.id}` : ''}
                </div>

                {/* Simple Input Box - Attached to the bottom edge */}
                {selectedElement && <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '380px',
                    padding: "4px",
                    pointerEvents: 'auto',
                    marginTop: "6px"
                }}>
                    <input type="text" placeholder='Ask agent...' value={textValue} onChange={e => setTextValue(e.target.value)} className="w-full position-relative overflow-hidden border bg-white border border-gray-400 text-black text-xs shadow-md outline-none p-[12px] rounded-sm" />
                    <span className='flex flex-col justify-center items-center gap-[12px]'>
                        <ArrowUpRight stroke='black' width={20} height={20} className='absolute right-20 top-1/2 -translate-y-1/2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity' />
                        <div className='absolute right-[72px] top-1/2 -translate-y-1/2 w-[1px] h-8 bg-gray-200' />
                        <CornerLeftUp
                            stroke='black'
                            width={20}
                            height={20}
                            className='absolute right-12 top-1/2 -translate-y-1/2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity'
                            onClick={(e) => {
                                e.stopPropagation();
                                if (selectedElement && selectedElement.parentElement) {
                                    const parent = selectedElement.parentElement;
                                    // Only navigate up if it's within the app and not a root system tag
                                    if (parent.tagName !== 'HTML' && parent.tagName !== 'BODY') {
                                        setSelectedElement(parent as HTMLElement);
                                    }
                                }
                            }}
                        />
                        <Code stroke='black' width={20} height={20} className='absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity' />
                    </span>
                </div>}
            </div>
        </div>}

        {/* Style Panel */}
        {enabled && selectedElement && <StyleEditorPanel ref={panelRef} selectedElement={selectedElement} onUpdate={handleStyleUpdate} onClose={() => setSelectedElement(null)} />}

        <div className="fixed bottom-4 right-4 z-50 flex gap-2" data-editor-ui="true">
            <Button onClick={() => setEnabled(!enabled)} variant={enabled ? "destructive" : "default"} className="rounded-full shadow-lg font-bold">
                {enabled ? 'Disable Edit Mode' : 'Enable Edit Mode'}
            </Button>
        </div>
    </>;
}