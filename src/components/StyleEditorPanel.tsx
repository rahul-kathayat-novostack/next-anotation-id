import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Check, Undo, Image as ImageIcon, CloudUpload, Link2, Loader2, MousePointer2, Zap, MousePointerClick, Clock, ShieldAlert, CircleDashed, CircleDivide, Ban } from "lucide-react"

interface StyleEditorPanelProps {
    selectedElement: HTMLElement | null;
    onUpdate: (newClassName: string, imageSrc?: string) => void;
    onClose: () => void;
}

type StylesState = {
    fontSize: string;
    fontWeight: string;
    color: string;
    lineHeight: string;
    letterSpacing: string;
    fontFamily: string;
    textAlign: string;
    opacity: string;
    paddingX: string;
    paddingY: string;
    marginX: string;
    marginY: string;
    display: string;
    flexDirection: string;
    justifyContent: string;
    alignItems: string;
    gap: string;
    shadowSize: string;
    shadowColor: string;
    borderWidth: string;
    borderColor: string;
    borderStyle: string;
    borderRadius: string;
    backgroundColor: string;
    backgroundImage: string;
    imageSrc: string;
    fontStyle: string;
    textDecoration: string;
    width: string;
    height: string;
    objectFit: string;
    objectPosition: string;
    // Hover Interaction
    hoverScale: string;
    hoverRotate: string;
    hoverTextColor: string;
    hoverBgColor: string;
    hoverOpacity: string;
    hoverShadow: string;
    hoverGlow: string;
    hoverRadius: string;
    // Active Interaction
    activeScale: string;
    activeRotate: string;
    activeTextColor: string;
    activeBgColor: string;
    activeOpacity: string;
    activeRadius: string;
    // Transitions
    transitionDuration: string;
};

export type StyleEditorPanelHandle = {
    updateDimensions: (width: number, height: number) => void;
};

export default React.forwardRef<StyleEditorPanelHandle, StyleEditorPanelProps>(function StyleEditorPanel({ selectedElement, onUpdate, onClose }, ref) {
    const [pendingStyles, setPendingStyles] = useState<StylesState>({
        fontSize: '',
        fontWeight: '',
        color: '#000000',
        lineHeight: '',
        letterSpacing: '',
        fontFamily: '',
        textAlign: '',
        opacity: '100',
        paddingX: '',
        paddingY: '',
        marginX: '',
        marginY: '',
        display: '',
        flexDirection: '',
        justifyContent: '',
        alignItems: '',
        gap: '',
        shadowSize: '',
        shadowColor: '#000000',
        borderWidth: '',
        borderColor: '#000000',
        borderStyle: '',
        borderRadius: '',
        backgroundColor: '',
        backgroundImage: '',
        imageSrc: '',
        fontStyle: '',
        textDecoration: '',
        width: '',
        height: '',
        objectFit: '',
        objectPosition: '',
        hoverScale: '',
        hoverRotate: '',
        hoverTextColor: '',
        hoverBgColor: '',
        hoverOpacity: '',
        hoverShadow: '',
        hoverGlow: '',
        activeScale: '',
        activeRotate: '',
        activeTextColor: '',
        activeBgColor: '',
        activeOpacity: '',
        transitionDuration: '300',
        hoverRadius: '',
        activeRadius: '',
    });
    const [originalStyles, setOriginalStyles] = useState<StylesState | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [textContent, setTextContent] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => ({
        updateDimensions(width: number, height: number) {
            setPendingStyles(prev => ({
                ...prev,
                width: width.toString(),
                height: height.toString()
            }));
            setHasChanges(true);
        }
    }));
    const originalClassNameRef = useRef<string>('');
    const originalImageSrcRef = useRef<string>('');
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Normalize color values to lowercase 6-digit hex
    const normalizeColor = (color: string): string => {
        if (!color) return color;
        // Already a hex color
        if (color.startsWith('#')) {
            const hex = color.replace('#', '').toLowerCase();
            // Expand 3-digit hex to 6-digit
            if (hex.length === 3) {
                return '#' + hex.split('').map(c => c + c).join('');
            }
            return '#' + hex;
        }
        return color;
    };

    useEffect(() => {
        if (selectedElement) {
            const computed = window.getComputedStyle(selectedElement);

            const rgbToHex = (rgb: string) => {
                if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '';
                if (rgb.startsWith('#')) return rgb;
                const rgbValues = rgb.match(/\d+/g);
                if (!rgbValues || rgbValues.length < 3) return '';

                // If it's rgba and alpha is 0, it's transparent
                if (rgbValues.length === 4 && rgbValues[3] === '0') return '';

                return '#' + rgbValues.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            };

            const parseShadow = (shadow: string) => {
                if (!shadow || shadow === 'none') return { size: '', color: '#000000' };
                const parts = shadow.split(' ');
                const size = parts[2] ? parseInt(parts[2]) + '' : '';
                return { size, color: '#000000' };
            };

            const shadowData = parseShadow(computed.boxShadow);

            const mapJustify = (val: string) => {
                const map: Record<string, string> = {
                    'flex-start': 'justify-start',
                    'center': 'justify-center',
                    'flex-end': 'justify-end',
                    'space-between': 'justify-between',
                    'space-around': 'justify-around',
                    'space-evenly': 'justify-evenly'
                };
                return map[val] || val;
            };

            const mapAlign = (val: string) => {
                const map: Record<string, string> = {
                    'flex-start': 'items-start',
                    'center': 'items-center',
                    'flex-end': 'items-end',
                    'baseline': 'items-baseline',
                    'stretch': 'items-stretch'
                };
                return map[val] || val;
            };

            const mapFlexDir = (val: string) => {
                if (val === 'row') return 'flex-row';
                if (val === 'column') return 'flex-col';
                return val;
            };

            // Recover intent from className
            const classList = selectedElement.className.split(/\s+/);

            const parseInteraction = (prefix: string, property: string) => {
                const fullPrefix = `${prefix}:${property}-[`;
                const found = classList.find(c => c.startsWith(fullPrefix));
                if (!found) return '';
                // Extracts content between [ and ]
                let val = found.substring(fullPrefix.length, found.length - 1);
                // Handle special cases
                if (property === 'rotate') val = val.replace('deg', '');
                if (property === 'opacity') val = (parseFloat(val) * 100).toString();
                return val;
            };

            const initialStyles: StylesState = {
                fontSize: parseInt(computed.fontSize) + '',
                fontWeight: computed.fontWeight,
                color: rgbToHex(computed.color) || '#000000',
                lineHeight: computed.lineHeight === 'normal' ? '1.5' : parseFloat(computed.lineHeight) / parseFloat(computed.fontSize) + '',
                letterSpacing: computed.letterSpacing === 'normal' ? '0' : parseFloat(computed.letterSpacing) + '',
                fontFamily: computed.fontFamily.split(',')[0].replace(/['"]/g, ''),
                textAlign: computed.textAlign,
                opacity: (parseFloat(computed.opacity) * 100).toFixed(0),
                paddingX: parseInt(computed.paddingLeft) + '',
                paddingY: parseInt(computed.paddingTop) + '',
                marginX: parseInt(computed.marginLeft) + '',
                marginY: parseInt(computed.marginTop) + '',
                display: computed.display,
                flexDirection: mapFlexDir(computed.flexDirection),
                justifyContent: mapJustify(computed.justifyContent),
                alignItems: mapAlign(computed.alignItems),
                gap: computed.gap === 'normal' ? '' : parseInt(computed.gap) + '',
                shadowSize: shadowData.size,
                shadowColor: shadowData.color,
                borderWidth: computed.borderWidth === '0px' ? '' : parseInt(computed.borderWidth) + '',
                borderColor: rgbToHex(computed.borderColor) || '#000000',
                borderStyle: computed.borderStyle === 'none' ? '' : computed.borderStyle,
                borderRadius: computed.borderRadius === '0px' ? '' : parseInt(computed.borderRadius) + '',
                backgroundColor: rgbToHex(computed.backgroundColor),
                backgroundImage: computed.backgroundImage === 'none' ? '' : computed.backgroundImage,
                imageSrc: selectedElement.tagName === 'IMG' ? (selectedElement as HTMLImageElement).src : '',
                fontStyle: computed.fontStyle === 'italic' ? 'italic' : '',
                textDecoration: computed.textDecoration.includes('underline') ? 'underline' : '',
                width: selectedElement.offsetWidth + '',
                height: selectedElement.offsetHeight + '',
                objectFit: computed.objectFit || '',
                objectPosition: computed.objectPosition || '',
                // Recover Interactions
                hoverScale: parseInteraction('hover', 'scale'),
                hoverRotate: parseInteraction('hover', 'rotate'),
                hoverTextColor: parseInteraction('hover', 'text'),
                hoverBgColor: parseInteraction('hover', 'bg'),
                hoverOpacity: parseInteraction('hover', 'opacity'),
                hoverRadius: parseInteraction('hover', 'radius'),
                hoverShadow: classList.includes('hover:shadow-[0_10px_25_rgba(0,0,0,0.2)]') ? 'true' : '',
                hoverGlow: classList.some(c => c.startsWith('hover:shadow-[0_0_15px_')) ? 'true' : '',
                activeScale: parseInteraction('active', 'scale'),
                activeRadius: parseInteraction('active', 'radius'),
                activeRotate: parseInteraction('active', 'rotate'),
                activeTextColor: parseInteraction('active', 'text'),
                activeBgColor: parseInteraction('active', 'bg'),
                activeOpacity: parseInteraction('active', 'opacity'),
                transitionDuration: classList.find(c => c.startsWith('duration-['))?.match(/\d+/)?.[0] || '300',
            };

            setPendingStyles(initialStyles);
            setOriginalStyles(initialStyles);
            setHasChanges(false);
            // Initialize text content for the content editor - ONLY for leaf nodes or text tags
            const hasElementChildren = selectedElement.children.length > 0;
            const isTextTag = ['P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'A', 'BUTTON', 'LI', 'LABEL'].includes(selectedElement.tagName);

            if (selectedElement.tagName !== 'IMG' && selectedElement.tagName !== 'HTML' && selectedElement.tagName !== 'BODY' && (!hasElementChildren || isTextTag)) {
                setTextContent(selectedElement.innerText || '');

                // Enable direct on-page editing only if it won't destroy child elements
                if (!hasElementChildren) {
                    selectedElement.contentEditable = 'true';
                }

                // Prevent empty elements from collapsing to zero size
                const originalMinHeight = selectedElement.style.minHeight;
                const originalMinWidth = selectedElement.style.minWidth;
                const originalOutline = selectedElement.style.outline;

                if (!selectedElement.innerText.trim()) {
                    selectedElement.style.minHeight = '1.5em';
                    selectedElement.style.minWidth = '20px';
                }

                const handleOnPageInput = () => {
                    setTextContent(selectedElement.innerText);
                    if (!selectedElement.innerText.trim()) {
                        selectedElement.style.minHeight = '1.5em';
                        selectedElement.style.minWidth = '20px';
                    } else {
                        selectedElement.style.minHeight = originalMinHeight;
                        selectedElement.style.minWidth = originalMinWidth;
                    }
                };

                const handleOnPageBlur = async () => {
                    const filePath = selectedElement.getAttribute('data-source-file');
                    const line = selectedElement.getAttribute('data-line');
                    const column = selectedElement.getAttribute('data-col');
                    if (filePath && line && column) {
                        await fetch('/api/edit-source', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                filePath, line, column,
                                newValue: selectedElement.innerText,
                                type: 'text',
                            }),
                        });
                    }
                };

                selectedElement.addEventListener('input', handleOnPageInput);
                selectedElement.addEventListener('blur', handleOnPageBlur);

                return () => {
                    selectedElement.contentEditable = 'false';
                    selectedElement.style.minHeight = originalMinHeight;
                    selectedElement.style.minWidth = originalMinWidth;
                    selectedElement.style.outline = originalOutline;
                    selectedElement.removeEventListener('input', handleOnPageInput);
                    selectedElement.removeEventListener('blur', handleOnPageBlur);
                };
            }
            originalClassNameRef.current = selectedElement.className;
            if (selectedElement.tagName === 'IMG') {
                originalImageSrcRef.current = (selectedElement as HTMLImageElement).src;
            }
        }
    }, [selectedElement]);

    // Update textarea height when textContent changes (e.g. from on-page editing)
    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [textContent]);

    const applyInlineStyles = (el: HTMLElement, s: StylesState) => {
        const style = el.style;
        if (s.fontSize) style.fontSize = `${s.fontSize}px`;
        if (s.fontWeight) style.fontWeight = s.fontWeight;
        if (s.color) style.color = s.color;
        if (s.fontFamily) {
            const fontStack = s.fontFamily.includes(' ') ? `"${s.fontFamily}"` : s.fontFamily;
            style.fontFamily = `${fontStack}, sans-serif`;
        }
        if (s.fontStyle) style.fontStyle = s.fontStyle;
        else style.fontStyle = 'normal';

        if (s.textDecoration) style.textDecoration = s.textDecoration;
        else style.textDecoration = 'none';

        if (s.lineHeight) style.lineHeight = s.lineHeight;
        if (s.letterSpacing) style.letterSpacing = `${s.letterSpacing}px`;
        if (s.textAlign) style.textAlign = s.textAlign;
        if (s.opacity) style.opacity = (parseFloat(s.opacity) / 100).toString();

        if (s.paddingX) {
            style.paddingLeft = `${s.paddingX}px`;
            style.paddingRight = `${s.paddingX}px`;
        }
        if (s.paddingY) {
            style.paddingTop = `${s.paddingY}px`;
            style.paddingBottom = `${s.paddingY}px`;
        }
        if (s.marginX) {
            style.marginLeft = `${s.marginX}px`;
            style.marginRight = `${s.marginX}px`;
        }
        if (s.marginY) {
            style.marginTop = `${s.marginY}px`;
            style.marginBottom = `${s.marginY}px`;
        }

        if (s.display) style.display = s.display;
        if (s.flexDirection && s.display?.includes('flex')) style.flexDirection = s.flexDirection.replace('flex-', '');

        if (s.justifyContent && (s.display?.includes('flex') || s.display?.includes('grid'))) {
            const val = s.justifyContent.replace('justify-', '');
            const cssVal = val === 'start' ? 'flex-start' :
                val === 'end' ? 'flex-end' :
                    val === 'between' ? 'space-between' :
                        val === 'around' ? 'space-around' :
                            val === 'evenly' ? 'space-evenly' : val;
            style.justifyContent = cssVal;
        }

        if (s.alignItems && (s.display?.includes('flex') || s.display?.includes('grid'))) {
            const val = s.alignItems.replace('items-', '');
            const cssVal = val === 'start' ? 'flex-start' :
                val === 'end' ? 'flex-end' : val;
            style.alignItems = cssVal;
        }
        if (s.gap) style.gap = `${s.gap}px`;
        if (s.width) style.width = `${s.width}px`;
        if (s.height) style.height = `${s.height}px`;
        if (s.objectFit) style.objectFit = s.objectFit;
        if (s.objectPosition) style.objectPosition = s.objectPosition;

        if (s.shadowSize) {
            style.boxShadow = `0 4px ${s.shadowSize}px ${s.shadowColor}40`;
        } else {
            style.boxShadow = '';
        }

        if (s.borderWidth) style.borderWidth = `${s.borderWidth}px`;
        if (s.borderColor) style.borderColor = s.borderColor;
        if (s.borderStyle) style.borderStyle = s.borderStyle;
        if (s.borderRadius) style.borderRadius = `${s.borderRadius}px`;
        if (s.backgroundColor) style.backgroundColor = s.backgroundColor;
        if (s.backgroundImage) {
            const url = s.backgroundImage.startsWith('url(')
                ? s.backgroundImage
                : `url(${s.backgroundImage})`;
            style.backgroundImage = url;
        }
    };

    const clearInlineStyles = (el: HTMLElement) => {
        const props = [
            'fontSize', 'fontWeight', 'color', 'lineHeight', 'letterSpacing',
            'textAlign', 'opacity', 'paddingLeft', 'paddingRight', 'paddingTop',
            'paddingBottom', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom',
            'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
            'boxShadow', 'borderWidth', 'borderColor', 'borderStyle', 'borderRadius',
            'backgroundColor', 'backgroundImage', 'width', 'height', 'objectFit', 'objectPosition'
        ];
        props.forEach(prop => {
            (el.style as any)[prop] = '';
        });
    };
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.url) {
                const key = selectedElement?.tagName === 'IMG' ? 'imageSrc' : 'backgroundImage';
                handleChange(key, data.url);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleChange = useCallback((key: keyof StylesState, value: string) => {
        const colorKeys: (keyof StylesState)[] = ['color', 'backgroundColor', 'borderColor', 'shadowColor'];
        const normalizedValue = colorKeys.includes(key) ? normalizeColor(value) : value;

        setPendingStyles(prev => {
            const next = { ...prev, [key]: normalizedValue };

            // LIVE VISUAL PREVIEW (Using inline styles to bypass Tailwind JIT latency)
            if (selectedElement) {
                if (key === 'imageSrc' && selectedElement.tagName === 'IMG') {
                    (selectedElement as HTMLImageElement).src = normalizedValue;
                } else {
                    applyInlineStyles(selectedElement, next);
                }
            }

            return next;
        });

        setHasChanges(true);
    }, [selectedElement]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const handleApply = async () => {
        if (!selectedElement || !originalStyles) return;

        const newClasses = generateTailwindClasses(originalClassNameRef.current, pendingStyles);

        // CLEAR INLINE PREVIEW STYLES before applying Tailwind classes to the file
        clearInlineStyles(selectedElement);

        // Now call the API with the final state
        await onUpdate(newClasses, pendingStyles.imageSrc);

        setOriginalStyles(pendingStyles);
        setHasChanges(false);
        originalClassNameRef.current = newClasses;
        if (selectedElement.tagName === 'IMG') {
            originalImageSrcRef.current = pendingStyles.imageSrc;
        }
    };

    const handleCancel = () => {
        if (!originalStyles || !selectedElement) return;

        setPendingStyles(originalStyles);
        setHasChanges(false);

        // CLEAR INLINE PREVIEW STYLES
        clearInlineStyles(selectedElement);

        // RESTORE ORIGINAL VISUAL STATE
        selectedElement.className = originalClassNameRef.current;
        if (selectedElement.tagName === 'IMG') {
            (selectedElement as HTMLImageElement).src = originalImageSrcRef.current;
        }
    };

    const generateTailwindClasses = (currentClass: string, s: StylesState) => {
        // Split current classes into an array for safer manipulation
        let classList = currentClass.split(/\s+/).filter(Boolean);

        const removeByPrefix = (prefixes: string[]) => {
            classList = classList.filter(cls => !prefixes.some(p => cls.startsWith(p)));
        };

        const removeByRegex = (regex: RegExp) => {
            classList = classList.filter(cls => !regex.test(cls));
        };

        // Font Size
        removeByPrefix(['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl']);
        removeByRegex(/^text-\[\d+(\.\d+)?(px|rem|em|%)\]$/);
        if (s.fontSize) classList.push(`text-[${s.fontSize}px]`);

        // Font Weight
        removeByPrefix(['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black']);
        removeByRegex(/^font-\[\d+\]$/);
        if (s.fontWeight) classList.push(`font-[${s.fontWeight}]`);

        // Font Family
        removeByPrefix(['font-sans', 'font-serif', 'font-google-sans']);
        removeByRegex(/^font-\['[^\]]*'\]$/);
        removeByRegex(/^font-\["[^\]]*"\]$/);
        if (s.fontFamily) {
            const fontVal = s.fontFamily.includes(' ') ? `'${s.fontFamily}'` : s.fontFamily;
            classList.push(`font-[${fontVal}]`);
        }

        // Font Style
        removeByPrefix(['italic', 'not-italic']);
        if (s.fontStyle === 'italic') classList.push('italic');

        // Text Decoration
        removeByPrefix(['underline', 'line-through', 'no-underline']);
        if (s.textDecoration === 'underline') classList.push('underline');

        // Text Color
        const tailwindColors = ['black', 'white', 'gray', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'indigo', 'cyan', 'teal', 'orange', 'lime', 'emerald', 'sky', 'violet', 'fuchsia', 'rose', 'amber', 'slate', 'zinc', 'neutral', 'stone'];
        removeByRegex(new RegExp(`^text-(${tailwindColors.join('|')})(-\\d+)?$`));
        removeByRegex(/^text-\[#?[0-9a-fA-F]{3,6}\]$/);
        removeByRegex(/^text-\[rgba?\([^\]]+\)\]$/);
        removeByRegex(/^text-\[hsla?\([^\]]+\)\]$/);
        if (s.color) classList.push(`text-[${s.color}]`);

        // Line Height
        removeByPrefix(['leading-']);
        if (s.lineHeight) classList.push(`leading-[${s.lineHeight}]`);

        // Letter Spacing
        removeByPrefix(['tracking-']);
        if (s.letterSpacing) classList.push(`tracking-[${s.letterSpacing}px]`);

        // Text Align
        removeByPrefix(['text-left', 'text-center', 'text-right', 'text-justify']);
        if (s.textAlign && s.textAlign !== 'start') classList.push(`text-${s.textAlign}`);

        // Opacity
        removeByPrefix(['opacity-']);
        if (s.opacity && s.opacity !== '100') classList.push(`opacity-[${s.opacity}%]`);

        // Padding
        removeByPrefix(['p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-', 'ps-', 'pe-']);
        if (s.paddingX) classList.push(`px-[${s.paddingX}px]`);
        if (s.paddingY) classList.push(`py-[${s.paddingY}px]`);

        // Margin
        removeByPrefix(['m-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-', 'ms-', 'me-', '-m-']);
        if (s.marginX) classList.push(`mx-[${s.marginX}px]`);
        if (s.marginY) classList.push(`my-[${s.marginY}px]`);

        // Width/Height
        removeByRegex(/^w-\[[^\]]+\]$/);
        removeByRegex(/^h-\[[^\]]+\]$/);
        if (s.width) classList.push(`w-[${s.width}px]`);
        if (s.height) classList.push(`h-[${s.height}px]`);

        // Image Layout (Object Fit)
        removeByPrefix(['object-']);
        if (s.objectFit) {
            const fitMap: any = { 'cover': 'object-cover', 'contain': 'object-contain', 'fill': 'object-fill', 'scale-down': 'object-scale-down' };
            if (fitMap[s.objectFit]) classList.push(fitMap[s.objectFit]);
        }
        if (s.objectPosition) {
            // Simplify object position to tailwind arbitrary value if it has spaces
            const pos = s.objectPosition.replace(/\s+/g, '_');
            classList.push(`object-[${pos}]`);
        }

        // Display
        removeByPrefix(['block', 'flex', 'grid', 'inline', 'hidden', 'inline-block', 'inline-flex', 'inline-grid']);
        if (s.display) classList.push(s.display);

        // Flex Direction
        removeByPrefix(['flex-row', 'flex-col']);
        if (s.flexDirection && s.display?.includes('flex')) classList.push(s.flexDirection);

        // Justify Content
        removeByPrefix(['justify-']);
        if (s.justifyContent && (s.display?.includes('flex') || s.display?.includes('grid'))) {
            classList.push(s.justifyContent);
        }

        // Align Items
        removeByPrefix(['items-']);
        if (s.alignItems && (s.display?.includes('flex') || s.display?.includes('grid'))) {
            classList.push(s.alignItems);
        }

        // Gap
        removeByPrefix(['gap-']);
        if (s.gap && (s.display?.includes('flex') || s.display?.includes('grid'))) {
            classList.push(`gap-[${s.gap}px]`);
        }

        // Shadow
        removeByPrefix(['shadow-']);
        removeByRegex(/^shadow(-sm|-md|-lg|-xl|-2xl|-inner|-none)?$/);
        if (s.shadowSize) {
            classList.push(`shadow-[0_4px_${s.shadowSize}px_${s.shadowColor}40]`);
        }

        // Border Width
        removeByRegex(/^border(-[0-9]+)?$/);
        removeByRegex(/^border-\[[^\]]+\]$/);
        if (s.borderWidth) classList.push(`border-[${s.borderWidth}px]`);

        // Border Color
        removeByRegex(new RegExp(`^border-(${tailwindColors.join('|')})(-\\d+)?$`));
        removeByRegex(/^border-\[#?[0-9a-fA-F]{3,6}\]$/);
        removeByRegex(/^border-\[rgba?\([^\]]+\)\]$/);
        if (s.borderColor && s.borderWidth) classList.push(`border-[${s.borderColor}]`);

        // Border Style
        removeByPrefix(['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-none']);
        if (s.borderStyle && s.borderWidth) classList.push(`border-${s.borderStyle}`);

        // Border Radius
        removeByPrefix(['rounded-']);
        if (s.borderRadius) classList.push(`rounded-[${s.borderRadius}px]`);

        // Background Color
        removeByRegex(new RegExp(`^bg-(${tailwindColors.join('|')})(-\\d+)?$`));
        removeByRegex(/^bg-\[#?[0-9a-fA-F]{3,6}\]$/);
        removeByRegex(/^bg-\[rgba?\([^\]]+\)\]$/);
        if (s.backgroundColor) classList.push(`bg-[${s.backgroundColor}]`);

        // Background Image
        removeByRegex(/^bg-\[url\([^\)]*\)\]$/);
        if (s.backgroundImage) {
            const url = s.backgroundImage.startsWith('url(')
                ? s.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1]
                : s.backgroundImage;
            if (url) classList.push(`bg-[url(${url})]`);
        }

        // Transition All (Auto-added if any interaction exists)
        removeByPrefix(['transition-']);
        const hasInter = s.hoverScale || s.hoverRotate || s.hoverTextColor || s.hoverBgColor || s.hoverOpacity || s.hoverShadow || s.hoverGlow || s.activeScale || s.activeRotate || s.activeTextColor || s.activeBgColor || s.activeOpacity;
        if (hasInter) classList.push('transition-all');

        // Transition Duration
        removeByPrefix(['duration-']);
        if (s.transitionDuration) classList.push(`duration-[${s.transitionDuration}ms]`);

        // Hover Utility Generation
        removeByPrefix(['hover:']);
        if (s.hoverScale) classList.push(`hover:scale-[${s.hoverScale}]`);
        if (s.hoverRotate) classList.push(`hover:rotate-[${s.hoverRotate}deg]`);
        if (s.hoverTextColor) classList.push(`hover:text-[${s.hoverTextColor}]`);
        if (s.hoverBgColor) classList.push(`hover:bg-[${s.hoverBgColor}]`);
        if (s.hoverOpacity) classList.push(`hover:opacity-[${parseFloat(s.hoverOpacity) / 100}]`);
        if (s.hoverShadow) classList.push(`hover:shadow-[0_10px_25px_rgba(0,0,0,0.2)]`);
        if (s.hoverGlow) classList.push(`hover:shadow-[0_0_15px_${s.hoverBgColor || '#3b82f6'}]`);

        // Active Utility Generation
        removeByPrefix(['active:']);
        if (s.activeScale) classList.push(`active:scale-[${s.activeScale}]`);
        if (s.activeRotate) classList.push(`active:rotate-[${s.activeRotate}deg]`);
        if (s.activeTextColor) classList.push(`active:text-[${s.activeTextColor}]`);
        if (s.activeBgColor) classList.push(`active:bg-[${s.activeBgColor}]`);
        if (s.activeOpacity) classList.push(`active:opacity-[${parseFloat(s.activeOpacity) / 100}]`);

        // Final deduplication and join
        return Array.from(new Set(classList)).join(' ');
    };

    if (!selectedElement) return null;

    return (
        <Card style={{
            backgroundImage: "url(/images/Background%20Grain.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
        }} className="fixed right-6 top-6 h-[calc(100vh-48px)] w-[400px] overflow-auto z-[10000] flex flex-col border border-border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 animate-in fade-in slide-in-from-right-4" data-editor-ui="true">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
                <CardTitle className="text-md font-medium">Visual Editor
                    <span className="text-sm text-gray-300 mx-4 px-2 py-1 bg-gray-800 rounded-xl">{selectedElement?.getAttribute('data-source-file')}</span>
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 -mr-2">
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>

            {/* Content Preview Section - Above Tabs */}
            <div className="px-4 pb-3 space-y-3 border-b border-border">
                {/* Element Nature Badge */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {selectedElement.tagName.toLowerCase()}
                    </span>
                    {selectedElement.id && (
                        <span className="text-[10px] text-muted-foreground">#{selectedElement.id}</span>
                    )}
                    {selectedElement.className && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">.{selectedElement.className.split(' ')[0]}</span>
                    )}
                </div>

                {/* Text Content Editor - for elements that support text */}
                {(['P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'A', 'BUTTON', 'LI', 'LABEL'].includes(selectedElement.tagName) ||
                    (selectedElement.childNodes.length > 0 && selectedElement.children.length === 0)) &&
                    selectedElement.tagName !== 'HTML' &&
                    selectedElement.tagName !== 'BODY' && (
                        <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Content</Label>
                            <textarea
                                rows={1}
                                value={textContent}
                                onChange={(e) => {
                                    setTextContent(e.target.value);
                                    selectedElement.innerText = e.target.value;
                                }}
                                ref={textareaRef}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                }}
                                onBlur={async () => {
                                    const filePath = selectedElement.getAttribute('data-source-file');
                                    const line = selectedElement.getAttribute('data-line');
                                    const column = selectedElement.getAttribute('data-col');
                                    if (filePath && line && column) {
                                        const res = await fetch('/api/edit-source', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                filePath, line, column,
                                                newValue: textContent,
                                                type: 'text',
                                            }),
                                        });
                                        if (!res.ok) console.error('Failed to save text');
                                    }
                                }}
                                className="w-full border border-input rounded-sm px-2 py-1 text-sm bg-background resize-none overflow-hidden"
                                placeholder="type..."
                            />
                        </div>
                    )}

                {/* Image Preview - for IMG elements or elements with background images */}
                {(selectedElement.tagName === 'IMG' || pendingStyles.backgroundImage) && (
                    <div className="space-y-2">
                        <div
                            className="relative group aspect-video rounded-lg overflow-hidden bg-muted border border-input hover:border-primary/50 transition-all"
                        >
                            {(pendingStyles.imageSrc || pendingStyles.backgroundImage) ? (
                                <>
                                    <img
                                        src={pendingStyles.imageSrc || pendingStyles.backgroundImage?.replace(/url\(['"]?(.*?)['"]?\)/, '$1')}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="rounded-full shadow-lg h-8 w-8"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="rounded-full shadow-lg h-8 w-8"
                                            onClick={() => setShowUrlInput(!showUrlInput)}
                                        >
                                            <Link2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1">
                                    <ImageIcon className="w-8 h-8 opacity-20" />
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowUrlInput(true)}>URL</Button>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                        </div>

                        {showUrlInput && (
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    value={selectedElement?.tagName === 'IMG' ? pendingStyles.imageSrc : pendingStyles.backgroundImage}
                                    onChange={(e) => {
                                        const key = selectedElement?.tagName === 'IMG' ? 'imageSrc' : 'backgroundImage';
                                        handleChange(key, e.target.value);
                                    }}
                                    placeholder="https://..."
                                    className="h-8 text-xs"
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowUrlInput(false)}><X className="w-3 h-3" /></Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Tabs defaultValue="typography" className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-10">
                    <TabsTrigger value="typography" className="rounded-sm border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Typography
                    </TabsTrigger>
                    <TabsTrigger value="layout" className="rounded-sm border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Layout
                    </TabsTrigger>
                    <TabsTrigger value="spacing" className="rounded-sm border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Spacing
                    </TabsTrigger>
                    <TabsTrigger value="effects" className="rounded-sm border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Effects
                    </TabsTrigger>
                    <TabsTrigger value="other" className="rounded-sm border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Other
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                    <TabsContent value="typography" className="mt-0 p-4 space-y-4">
                        {/* Font */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Font</Label>
                            <Select
                                value={pendingStyles.fontFamily}
                                onValueChange={(value) => handleChange('fontFamily', value)}
                            >
                                <SelectTrigger className="h-9 bg-background border-input">
                                    <SelectValue placeholder="Select font" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-apple-system">-apple-system</SelectItem>
                                    <SelectItem value="Arial">Arial</SelectItem>
                                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                    <SelectItem value="Georgia">Georgia</SelectItem>
                                    <SelectItem value="Courier New">Courier New</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Size */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Size</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={pendingStyles.fontSize}
                                    onChange={(e) => handleChange('fontSize', e.target.value)}
                                    className="h-9 bg-background border-input"
                                />
                                <span className="text-xs text-muted-foreground min-w-[24px]">PX</span>
                            </div>
                        </div>

                        {/* Weight */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Weight</Label>
                            <Select
                                value={pendingStyles.fontWeight}
                                onValueChange={(value) => handleChange('fontWeight', value)}
                            >
                                <SelectTrigger className="h-9 bg-background border-input">
                                    <SelectValue placeholder="Regular" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="100">Thin</SelectItem>
                                    <SelectItem value="200">Extra Light</SelectItem>
                                    <SelectItem value="300">Light</SelectItem>
                                    <SelectItem value="400">Regular</SelectItem>
                                    <SelectItem value="500">Medium</SelectItem>
                                    <SelectItem value="600">Semi Bold</SelectItem>
                                    <SelectItem value="700">Bold</SelectItem>
                                    <SelectItem value="800">Extra Bold</SelectItem>
                                    <SelectItem value="900">Black</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Color */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Color</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-input bg-background">
                                    <input
                                        type="color"
                                        value={pendingStyles.color}
                                        onChange={(e) => handleChange('color', e.target.value)}
                                        className="absolute -top-2 -left-2 h-16 w-16 cursor-pointer p-0 border-0"
                                    />
                                </div>
                                <Input
                                    type="text"
                                    value={pendingStyles.color}
                                    onChange={(e) => handleChange('color', e.target.value)}
                                    className="uppercase h-9 bg-background border-input"
                                />
                            </div>
                        </div>

                        {/* Align */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Align</Label>
                            <ToggleGroup
                                type="single"
                                value={pendingStyles.textAlign}
                                onValueChange={(value) => value && handleChange('textAlign', value)}
                                className="justify-start border border-input rounded-md bg-background"
                            >
                                <ToggleGroupItem value="left" aria-label="Align left" className="h-9 flex-1 data-[state=on]:bg-accent">
                                    <AlignLeft className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="center" aria-label="Align center" className="h-9 flex-1 data-[state=on]:bg-accent">
                                    <AlignCenter className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="right" aria-label="Align right" className="h-9 flex-1 data-[state=on]:bg-accent">
                                    <AlignRight className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="justify" aria-label="Justify" className="h-9 flex-1 data-[state=on]:bg-accent">
                                    <AlignJustify className="h-4 w-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        {/* Style (Bold, Italic, Underline) */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Style</Label>
                            <ToggleGroup
                                type="multiple"
                                value={[
                                    ...(pendingStyles.fontWeight === '700' || pendingStyles.fontWeight === 'bold' ? ['bold'] : []),
                                    ...(pendingStyles.fontStyle === 'italic' ? ['italic'] : []),
                                    ...(pendingStyles.textDecoration === 'underline' ? ['underline'] : [])
                                ]}
                                onValueChange={(values) => {
                                    handleChange('fontWeight', values.includes('bold') ? '700' : '400');
                                    handleChange('fontStyle', values.includes('italic') ? 'italic' : '');
                                    handleChange('textDecoration', values.includes('underline') ? 'underline' : '');
                                }}
                                className="justify-start border border-input rounded-md bg-background"
                            >
                                <ToggleGroupItem value="bold" aria-label="Bold" className="h-9 flex-1 data-[state=on]:bg-accent">
                                    <Bold className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="italic" aria-label="Italic" className="h-9 flex-1 data-[state=on]:bg-accent">
                                    <Italic className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="underline" aria-label="Underline" className="h-9 flex-1 data-[state=on]:bg-accent">
                                    <Underline className="h-4 w-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        {/* Line Height */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Line Height</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={pendingStyles.lineHeight}
                                onChange={(e) => handleChange('lineHeight', e.target.value)}
                                className="h-9 bg-background border-input"
                            />
                        </div>

                        {/* Letter Spacing */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Letter Spacing</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={pendingStyles.letterSpacing}
                                    onChange={(e) => handleChange('letterSpacing', e.target.value)}
                                    className="h-9 bg-background border-input"
                                />
                                <span className="text-xs text-muted-foreground min-w-[24px]">PX</span>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="layout" className="mt-0 p-4 space-y-4">
                        {/* Display */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Display</Label>
                            <ToggleGroup
                                type="single"
                                value={pendingStyles.display}
                                onValueChange={(value) => value && handleChange('display', value)}
                                className="justify-start border border-input rounded-md bg-background grid grid-cols-3"
                            >
                                <ToggleGroupItem value="block" className="h-9 data-[state=on]:bg-accent">
                                    Block
                                </ToggleGroupItem>
                                <ToggleGroupItem value="flex" className="h-9 data-[state=on]:bg-accent">
                                    Flex
                                </ToggleGroupItem>
                                <ToggleGroupItem value="grid" className="h-9 data-[state=on]:bg-accent">
                                    Grid
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        {/* Flex Direction - only show if display is flex */}
                        {pendingStyles.display?.includes('flex') && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Direction</Label>
                                <ToggleGroup
                                    type="single"
                                    value={pendingStyles.flexDirection}
                                    onValueChange={(value) => value && handleChange('flexDirection', value)}
                                    className="justify-start border border-input rounded-md bg-background grid grid-cols-2"
                                >
                                    <ToggleGroupItem value="flex-row" className="h-9 data-[state=on]:bg-accent">
                                        Row
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="flex-col" className="h-9 data-[state=on]:bg-accent">
                                        Column
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        )}

                        {/* Justify Content - show for flex and grid */}
                        {(pendingStyles.display?.includes('flex') || pendingStyles.display?.includes('grid')) && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Justify (Horizontal)</Label>
                                <Select
                                    value={pendingStyles.justifyContent}
                                    onValueChange={(value) => handleChange('justifyContent', value)}
                                >
                                    <SelectTrigger className="h-9 bg-background border-input">
                                        <SelectValue placeholder="Select justify" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="justify-start">Start</SelectItem>
                                        <SelectItem value="justify-center">Center</SelectItem>
                                        <SelectItem value="justify-end">End</SelectItem>
                                        <SelectItem value="justify-between">Between</SelectItem>
                                        <SelectItem value="justify-around">Around</SelectItem>
                                        <SelectItem value="justify-evenly">Evenly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Align Items - show for flex and grid */}
                        {(pendingStyles.display?.includes('flex') || pendingStyles.display?.includes('grid')) && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Align (Vertical)</Label>
                                <Select
                                    value={pendingStyles.alignItems}
                                    onValueChange={(value) => handleChange('alignItems', value)}
                                >
                                    <SelectTrigger className="h-9 bg-background border-input">
                                        <SelectValue placeholder="Select align" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="items-start">Start</SelectItem>
                                        <SelectItem value="items-center">Center</SelectItem>
                                        <SelectItem value="items-end">End</SelectItem>
                                        <SelectItem value="items-baseline">Baseline</SelectItem>
                                        <SelectItem value="items-stretch">Stretch</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Gap - show for flex and grid */}
                        {(pendingStyles.display?.includes('flex') || pendingStyles.display?.includes('grid')) && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Gap</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={pendingStyles.gap}
                                        onChange={(e) => handleChange('gap', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="0"
                                    />
                                    <span className="text-xs text-muted-foreground min-w-[24px]">PX</span>
                                </div>
                            </div>
                        )}

                        <Separator />
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Dimensions</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-8">
                                    <span className="text-xs text-muted-foreground w-4">Width</span>
                                    <Input
                                        type="number"
                                        value={pendingStyles.width}
                                        onChange={(e) => handleChange('width', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="Auto"
                                    />
                                </div>
                                <div className="flex items-center gap-8">
                                    <span className="text-xs text-muted-foreground w-4">Height</span>
                                    <Input
                                        type="number"
                                        value={pendingStyles.height}
                                        onChange={(e) => handleChange('height', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="Auto"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="spacing" className="mt-0 p-4 space-y-4">
                        {/* Padding */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Padding</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4">↔</span>
                                    <Input
                                        type="number"
                                        value={pendingStyles.paddingX}
                                        onChange={(e) => handleChange('paddingX', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="X"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4">↕</span>
                                    <Input
                                        type="number"
                                        value={pendingStyles.paddingY}
                                        onChange={(e) => handleChange('paddingY', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="Y"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Margin */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Margin</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4">↔</span>
                                    <Input
                                        type="number"
                                        value={pendingStyles.marginX}
                                        onChange={(e) => handleChange('marginX', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="X"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4">↕</span>
                                    <Input
                                        type="number"
                                        value={pendingStyles.marginY}
                                        onChange={(e) => handleChange('marginY', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="Y"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="other" className="mt-0 p-4 space-y-6">
                        {/* Background Section */}
                        <div className="space-y-2">
                            <Label className="text-md text-white tracking-wider">Background</Label>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Color</Label>
                                <div className="flex items-center gap-2">
                                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-input bg-background">
                                        <input
                                            type="color"
                                            value={pendingStyles.backgroundColor || '#ffffff'}
                                            onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                            className="absolute -top-2 -left-2 h-16 w-16 cursor-pointer p-0 border-0"
                                        />
                                    </div>
                                    <Input
                                        type="text"
                                        value={pendingStyles.backgroundColor}
                                        onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                        className="uppercase h-9 bg-background border-input"
                                        placeholder="#FFFFFF"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Media Hero Section */}
                        <div className="space-y-4">
                            <Label className="text-md text-white tracking-wider">Media</Label>

                            {/* Media Hero Preview */}
                            <div
                                className="relative group aspect-video rounded-xl overflow-hidden bg-muted border-2 border-dashed border-input hover:border-primary/50 transition-all cursor-default"
                            >
                                {(pendingStyles.imageSrc || pendingStyles.backgroundImage) ? (
                                    <>
                                        <img
                                            src={pendingStyles.imageSrc || pendingStyles.backgroundImage?.replace(/url\(['"]?(.*?)['"]?\)/, '$1')}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="rounded-full shadow-lg"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="rounded-full shadow-lg"
                                                onClick={() => setShowUrlInput(!showUrlInput)}
                                            >
                                                <Link2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                        <ImageIcon className="w-10 h-10 opacity-20" />
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                                            <Button variant="ghost" size="sm" onClick={() => setShowUrlInput(true)}>URL</Button>
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            {/* URL Input (Revealed via 'Link' button) */}
                            {showUrlInput && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <Label className="text-xs">Image URL</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            value={selectedElement?.tagName === 'IMG' ? pendingStyles.imageSrc : pendingStyles.backgroundImage}
                                            onChange={(e) => {
                                                const key = selectedElement?.tagName === 'IMG' ? 'imageSrc' : 'backgroundImage';
                                                handleChange(key, e.target.value);
                                            }}
                                            placeholder="https://..."
                                            className="h-9 bg-background focus-visible:ring-1"
                                        />
                                        <Button size="icon" variant="ghost" onClick={() => setShowUrlInput(false)}><X className="w-[16px] sh-[16px]" /></Button>
                                    </div>
                                </div>
                            )}

                            {/* Layout & Focus Section */}
                            {(pendingStyles.imageSrc || pendingStyles.backgroundImage) && (
                                <div className="space-y-4 animate-in fade-in duration-500">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Fitting</Label>
                                        <Select
                                            value={pendingStyles.objectFit || 'cover'}
                                            onValueChange={(val) => handleChange('objectFit', val)}
                                        >
                                            <SelectTrigger className="h-9 bg-background">
                                                <SelectValue placeholder="Select fit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cover">Cover (Fill)</SelectItem>
                                                <SelectItem value="contain">Contain (Fit)</SelectItem>
                                                <SelectItem value="fill">Stretch</SelectItem>
                                                <SelectItem value="scale-down">Scale Down</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs text-muted-foreground">Focus Point</Label>
                                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-google-sans">
                                                {pendingStyles.objectPosition || 'center'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            {[
                                                'top-left', 'top-center', 'top-right',
                                                'center-left', 'center', 'center-right',
                                                'bottom-left', 'bottom-center', 'bottom-right'
                                            ].map(pos => (
                                                <Button
                                                    key={pos}
                                                    variant={pendingStyles.objectPosition === pos.replace('-', ' ') ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-8 p-0 text-[10px]"
                                                    onClick={() => handleChange('objectPosition', pos.replace('-', ' '))}
                                                >
                                                    {pos}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Shadow Section */}
                        <div className="space-y-4">
                            <Label className="text-md text-white-foreground tracking-wider">Shadow</Label>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Size</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={pendingStyles.shadowSize}
                                        onChange={(e) => handleChange('shadowSize', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="0"
                                    />
                                    <span className="text-xs text-muted-foreground min-w-[24px]">PX</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Color</Label>
                                <div className="flex items-center gap-2">
                                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-input bg-background">
                                        <input
                                            type="color"
                                            value={pendingStyles.shadowColor || '#000000'}
                                            onChange={(e) => handleChange('shadowColor', e.target.value)}
                                            className="absolute -top-2 -left-2 h-16 w-16 cursor-pointer p-0 border-0"
                                        />
                                    </div>
                                    <Input
                                        type="text"
                                        value={pendingStyles.shadowColor}
                                        onChange={(e) => handleChange('shadowColor', e.target.value)}
                                        className="uppercase h-9 bg-background border-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Border */}
                        <div className="space-y-4">
                            <h4 className="text-md text-white">Border</h4>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Width</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={pendingStyles.borderWidth}
                                        onChange={(e) => handleChange('borderWidth', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="0"
                                    />
                                    <span className="text-xs text-muted-foreground min-w-[24px]">PX</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Color</Label>
                                <div className="flex items-center gap-2">
                                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-input bg-background">
                                        <input
                                            type="color"
                                            value={pendingStyles.borderColor}
                                            onChange={(e) => handleChange('borderColor', e.target.value)}
                                            className="absolute -top-2 -left-2 h-16 w-16 cursor-pointer p-0 border-0"
                                        />
                                    </div>
                                    <Input
                                        type="text"
                                        value={pendingStyles.borderColor}
                                        onChange={(e) => handleChange('borderColor', e.target.value)}
                                        className="uppercase h-9 bg-background border-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Style</Label>
                                <Select
                                    value={pendingStyles.borderStyle}
                                    onValueChange={(value) => handleChange('borderStyle', value)}
                                >
                                    <SelectTrigger className="h-9 bg-background border-input">
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="solid">Solid</SelectItem>
                                        <SelectItem value="dashed">Dashed</SelectItem>
                                        <SelectItem value="dotted">Dotted</SelectItem>
                                        <SelectItem value="double">Double</SelectItem>
                                        <SelectItem value="none">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Radius</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={pendingStyles.borderRadius}
                                        onChange={(e) => handleChange('borderRadius', e.target.value)}
                                        className="h-9 bg-background border-input"
                                        placeholder="0"
                                    />
                                    <span className="text-xs text-muted-foreground min-w-[24px]">PX</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Opacity */}
                        <div className="space-y-3">
                            <Label className="text-xs text-muted-foreground">Opacity</Label>
                            <div className="flex items-center gap-4">
                                <Slider
                                    value={[parseFloat(pendingStyles.opacity)]}
                                    onValueChange={(value) => handleChange('opacity', value[0].toString())}
                                    max={100}
                                    step={1}
                                    className="flex-1"
                                />
                                <div className="flex items-center gap-1 w-20">
                                    <Input
                                        type="number"
                                        value={pendingStyles.opacity}
                                        onChange={(e) => handleChange('opacity', e.target.value)}
                                        className="h-9 w-full bg-background border-input text-center"
                                        min="0"
                                        max="100"
                                    />
                                    <span className="text-xs text-muted-foreground">%</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="effects" className="mt-0 p-4 space-y-6">
                        {selectedElement && (selectedElement.tagName === 'BODY' || selectedElement.tagName === 'HTML') ? (
                            <div className='flex justify-center align-center items-center'>
                                <Ban className="w-12 h-12 opacity-50" />
                            </div>
                        ) : (
                            <>
                                {/* Hover Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm font-bold">Hover Effects</Label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">Scale (e.g. 1.1)</Label>
                                            <Input
                                                value={pendingStyles.hoverScale}
                                                onChange={(e) => handleChange('hoverScale', e.target.value)}
                                                placeholder="1.0"
                                                className="h-8 text-xs font-google-sans"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">Rotate (deg)</Label>
                                            <Input
                                                value={pendingStyles.hoverRotate}
                                                onChange={(e) => handleChange('hoverRotate', e.target.value)}
                                                placeholder="0"
                                                className="h-8 text-xs font-google-sans"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">Color (Hex)</Label>
                                            <Input
                                                value={pendingStyles.hoverTextColor}
                                                onChange={(e) => handleChange('hoverTextColor', e.target.value)}
                                                placeholder="#000000"
                                                className="h-8 text-xs font-google-sans"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">Bg Color (Hex)</Label>
                                            <Input
                                                value={pendingStyles.hoverBgColor}
                                                onChange={(e) => handleChange('hoverBgColor', e.target.value)}
                                                placeholder="#FFFF"
                                                className="h-8 text-xs font-google-sans"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">Opacity (0-100)</Label>
                                            <Input
                                                type="number"
                                                value={pendingStyles.hoverOpacity}
                                                onChange={(e) => handleChange('hoverOpacity', e.target.value)}
                                                placeholder="100"
                                                className="h-8 text-xs font-google-sans"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground flex items-center justify-between">
                                                Glow <span className="text-[8px] opacity-70">Requires BG Color</span>
                                            </Label>
                                            <Button
                                                variant={pendingStyles.hoverGlow ? "default" : "outline"}
                                                size="sm"
                                                className="h-8 w-full text-[10px]"
                                                onClick={() => handleChange('hoverGlow', pendingStyles.hoverGlow ? '' : 'true')}
                                            >
                                                {pendingStyles.hoverGlow ? "Glow ON" : "Add Glow"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Active Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm font-bold">Active State</Label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">Scale</Label>
                                            <Input
                                                value={pendingStyles.activeScale}
                                                onChange={(e) => handleChange('activeScale', e.target.value)}
                                                placeholder="0.95"
                                                className="h-8 text-xs font-google-sans"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">Rotate (deg)</Label>
                                            <Input
                                                value={pendingStyles.activeRotate}
                                                onChange={(e) => handleChange('activeRotate', e.target.value)}
                                                placeholder='32'
                                                className="h-8 text-xs font-google-sans"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">Color (Hex)</Label>
                                            <Input
                                                value={pendingStyles.activeTextColor}
                                                onChange={(e) => handleChange('activeTextColor', e.target.value)}
                                                className="h-8 text-xs font-google-sans"
                                                placeholder='#000000'
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground">BG Color (Hex)</Label>
                                            <Input
                                                value={pendingStyles.activeBgColor}
                                                onChange={(e) => handleChange('activeBgColor', e.target.value)}
                                                className="h-8 text-xs font-google-sans"
                                                placeholder='#FFFFFF'
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Transition Duration */}
                                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <Label className="text-[10px] font-bold uppercase">Transition Speed</Label>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Slider
                                            value={[parseFloat(pendingStyles.transitionDuration || '300')]}
                                            onValueChange={(val) => handleChange('transitionDuration', val[0].toString())}
                                            min={0}
                                            max={1000}
                                            step={50}
                                            className="flex-1"
                                        />
                                        <span className="text-[10px] font-google-sans w-12">{pendingStyles.transitionDuration}ms</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </TabsContent>
                </ScrollArea>
            </Tabs>
            {hasChanges && (
                <div className="flex gap-2 p-4 border-t bg-background">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1"
                        disabled={!hasChanges}
                    >
                        <Undo className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApply}
                        className="flex-1"
                        disabled={!hasChanges}
                    >
                        <Check className="h-4 w-4 mr-2" />
                        Apply
                    </Button>
                </div>
            )}
        </Card>
    );
});