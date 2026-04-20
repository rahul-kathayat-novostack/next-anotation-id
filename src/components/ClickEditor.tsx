'use client';

import React, { useEffect, useState, useRef } from 'react';
import StyleEditorPanel from './StyleEditorPanel';
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

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

    const saveChange = async (
        filePath: string,
        line: string,
        column: string,
        newValue: string,
        type: 'text' | 'image-src' | 'update-attribute',
        attributeName?: string
    ) => {
        try {
            const res = await fetch('/api/edit-source', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filePath,
                    line,
                    column,
                    newValue,
                    type,
                    attributeName,
                }),
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
                    await saveChange(
                        lastItem.filePath,
                        lastItem.line,
                        lastItem.column,
                        lastItem.value,
                        lastItem.type,
                        lastItem.attributeName
                    );
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

        const updateOverlay = () => {
            if (!selectedElement) return;
            const rect = selectedElement.getBoundingClientRect();
            setOverlayStyle({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height,
            });
        };

        updateOverlay();
        window.addEventListener('resize', updateOverlay);
        window.addEventListener('scroll', updateOverlay, true);

        const observer = new ResizeObserver(updateOverlay);
        observer.observe(selectedElement);

        return () => {
            window.removeEventListener('resize', updateOverlay);
            window.removeEventListener('scroll', updateOverlay, true);
            observer.disconnect();
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

            // Ignore clicks on the editor UI itself
            if (target.closest('[data-editor-ui="true"]')) return;

            // Only handle elements that are explicitly marked as editable
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
    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        if (!selectedElement) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = selectedElement.offsetWidth;
        const startHeight = selectedElement.offsetHeight;
        const startClassName = selectedElement.getAttribute('class') || '';

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!selectedElement) return;
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;

            if (direction.includes('e')) newWidth = startWidth + dx;
            if (direction.includes('s')) newHeight = startHeight + dy;
            if (direction.includes('w')) newWidth = startWidth - dx; // Simplified, usually needs position adjustment
            if (direction.includes('n')) newHeight = startHeight - dy;

            // Apply visually
            selectedElement.style.width = `${newWidth}px`;
            selectedElement.style.height = `${newHeight}px`;
        };

        const onMouseUp = async () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (!selectedElement) return;

            const finalWidth = selectedElement.offsetWidth;
            const finalHeight = selectedElement.offsetHeight;

            // Generate Tailwind classes
            // Remove existing width/height classes
            let newClassName = startClassName
                .replace(/\bw-\[.*?\]/g, '')
                .replace(/\bh-\[.*?\]/g, '')
                .replace(/\bw-[\w-\/]+/g, '') // w-full, w-1/2, etc.
                .replace(/\bh-[\w-\/]+/g, '')
                .trim();

            // Add new arbitrary values
            newClassName = `${newClassName} w-[${finalWidth}px] h-[${finalHeight}px]`.trim();

            // We do NOT clear the inline styles here.
            // If we clear them immediately, the element will snap back to its original size
            // before the HMR update (with the new Tailwind classes) kicks in, causing a glitch.
            // By leaving them, we ensure visual stability. When the component is hard-reloaded
            // or if React replaces the node, the inline styles will be gone, but the classes will be there.
            // selectedElement.style.width = '';
            // selectedElement.style.height = '';

            // If we clear immediately, it snaps back. 
            // Ideally we wait, but for MVP let's just save.
            // We can leave the inline style, and next time the component re-renders from server/HMR, it might be gone?
            // Actually, inline styles persist unless removed.
            // Let's remove them and hope the class is applied quickly. 
            // Or better: The class update will trigger a re-render.

            const filePath = selectedElement.getAttribute('data-source-file');
            const line = selectedElement.getAttribute('data-line');
            const column = selectedElement.getAttribute('data-col');

            if (filePath && line && column && newClassName !== startClassName) {
                addToHistory({
                    filePath,
                    line,
                    column,
                    value: startClassName,
                    type: 'update-attribute',
                    attributeName: 'className'
                });

                await saveChange(filePath, line, column, newClassName, 'update-attribute', 'className');
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleStyleUpdate = async (newClassName: string, imageSrc?: string) => {
        if (!selectedElement) return;

        const filePath = selectedElement.getAttribute('data-source-file');
        const line = selectedElement.getAttribute('data-line');
        const column = selectedElement.getAttribute('data-col');
        const oldClassName = selectedElement.className;

        // Handle className update
        if (filePath && line && column && newClassName !== oldClassName) {
            selectedElement.className = newClassName;
            await saveChange(filePath, line, column, newClassName, 'update-attribute', 'className');
        }

        // Handle image src update
        if (imageSrc && selectedElement.tagName === 'IMG' && filePath && line && column) {
            const imgElement = selectedElement as HTMLImageElement;
            const oldSrc = imgElement.src;

            if (imageSrc !== oldSrc) {
                imgElement.src = imageSrc;
                await saveChange(filePath, line, column, imageSrc, 'image-src');
            }
        }
    };

    return (
        <>
            {props.children}

            {/* Editor UI Overlay */}
            {enabled && selectedElement && overlayStyle && (
                <div
                    data-editor-ui="true"
                    style={{
                        position: 'absolute',
                        ...overlayStyle,
                        pointerEvents: 'none', // Let clicks pass through to the element (except handles)
                        border: '2px solid #3b82f6',
                        zIndex: 9999,
                    }}
                >
                    {/* Resize Handles */}
                    {['se', 'e', 's'].map((dir) => (
                        <div
                            key={dir}
                            onMouseDown={(e) => handleResizeStart(e, dir)}
                            style={{
                                position: 'absolute',
                                width: '10px',
                                height: '10px',
                                background: 'white',
                                border: '1px solid #3b82f6',
                                pointerEvents: 'auto',
                                cursor: `${dir}-resize`,
                                ...(dir === 'se' ? { bottom: -6, right: -6 } : {}),
                                ...(dir === 'e' ? { top: '50%', right: -6, transform: 'translateY(-50%)' } : {}),
                                ...(dir === 's' ? { bottom: -6, left: '50%', transform: 'translateX(-50%)' } : {}),
                            }}
                        />
                    ))}

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
                </div>
            )}

            {/* Style Panel */}
            {enabled && selectedElement && (
                <StyleEditorPanel
                    selectedElement={selectedElement}
                    onUpdate={handleStyleUpdate}
                    onClose={() => setSelectedElement(null)}
                />
            )}

            <div className="fixed bottom-4 right-4 z-50 flex gap-2" data-editor-ui="true">
                <ModeToggle />
                <Button
                    onClick={() => setEnabled(!enabled)}
                    variant={enabled ? "destructive" : "default"}
                    className="rounded-full shadow-lg font-bold"
                >
                    {enabled ? 'Disable Edit Mode' : 'Enable Edit Mode'}
                </Button>
            </div>
        </>
    );
}
