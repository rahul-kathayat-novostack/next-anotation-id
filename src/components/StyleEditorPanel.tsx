import React, { useEffect, useState, useRef } from 'react';
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
import { X, AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Check, Undo } from "lucide-react"

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
};

export default function StyleEditorPanel({ selectedElement, onUpdate, onClose }: StyleEditorPanelProps) {
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
    });
    const [originalStyles, setOriginalStyles] = useState<StylesState | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const originalClassNameRef = useRef<string>('');

    useEffect(() => {
        if (selectedElement) {
            const computed = window.getComputedStyle(selectedElement);

            const rgbToHex = (rgb: string) => {
                if (!rgb || rgb === 'rgba(0, 0, 0, 0)') return '#000000';
                if (rgb.startsWith('#')) return rgb;
                const rgbValues = rgb.match(/\d+/g);
                if (!rgbValues) return '#000000';
                return '#' + rgbValues.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            };

            const parseShadow = (shadow: string) => {
                if (!shadow || shadow === 'none') return { size: '', color: '#000000' };
                const parts = shadow.split(' ');
                const size = parts[2] ? parseInt(parts[2]) + '' : '';
                return { size, color: '#000000' };
            };

            const shadowData = parseShadow(computed.boxShadow);

            const initialStyles: StylesState = {
                fontSize: parseInt(computed.fontSize) + '',
                fontWeight: computed.fontWeight,
                color: rgbToHex(computed.color),
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
                flexDirection: computed.flexDirection,
                justifyContent: computed.justifyContent,
                alignItems: computed.alignItems,
                gap: computed.gap === 'normal' ? '' : parseInt(computed.gap) + '',
                shadowSize: shadowData.size,
                shadowColor: shadowData.color,
                borderWidth: computed.borderWidth === '0px' ? '' : parseInt(computed.borderWidth) + '',
                borderColor: rgbToHex(computed.borderColor),
                borderStyle: computed.borderStyle === 'none' ? '' : computed.borderStyle,
                borderRadius: computed.borderRadius === '0px' ? '' : parseInt(computed.borderRadius) + '',
                backgroundColor: computed.backgroundColor === 'rgba(0, 0, 0, 0)' ? '' : rgbToHex(computed.backgroundColor),
                backgroundImage: computed.backgroundImage === 'none' ? '' : computed.backgroundImage,
                imageSrc: selectedElement.tagName === 'IMG' ? (selectedElement as HTMLImageElement).src : '',
            };

            setPendingStyles(initialStyles);
            setOriginalStyles(initialStyles);
            setHasChanges(false);
            originalClassNameRef.current = selectedElement.className;
        }
    }, [selectedElement]);

    const handleChange = (key: keyof StylesState, value: string) => {
        const newPending = { ...pendingStyles, [key]: value };
        setPendingStyles(newPending);

        if (key === 'imageSrc' && selectedElement?.tagName === 'IMG') {
            onUpdate(selectedElement.className, value);
            return;
        }

        setHasChanges(true);
    };

    const handleApply = async () => {
        if (!selectedElement || !originalStyles) return;

        const newClasses = generateTailwindClasses(originalClassNameRef.current, pendingStyles);
        await onUpdate(newClasses);

        setOriginalStyles(pendingStyles);
        setHasChanges(false);
        originalClassNameRef.current = newClasses;
    };

    const handleCancel = () => {
        if (!originalStyles || !selectedElement) return;

        setPendingStyles(originalStyles);
        setHasChanges(false);

        const originalClasses = generateTailwindClasses(originalClassNameRef.current, originalStyles);
        onUpdate(originalClasses);
        originalClassNameRef.current = originalClasses;
    };

    const generateTailwindClasses = (currentClass: string, s: StylesState) => {
        let classes = currentClass;

        const removeClass = (regex: RegExp) => {
            classes = classes.replace(regex, '').trim();
        };

        // Font Size
        removeClass(/\btext-\[\d+px\]\b/g);
        removeClass(/\btext-(xs|sm|base|lg|xl|\d+xl)\b/g);
        if (s.fontSize) classes += ` text-[${s.fontSize}px]`;

        // Font Weight
        removeClass(/\bfont-\[\d+\]\b/g);
        removeClass(/\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g);
        if (s.fontWeight) classes += ` font-[${s.fontWeight}]`;

        // Color
        removeClass(/\btext-\[#\w+\]\b/g);
        if (s.color) classes += ` text-[${s.color}]`;

        // Line Height
        removeClass(/\bleading-\[.*?\]\b/g);
        removeClass(/\bleading-(none|tight|snug|normal|relaxed|loose)\b/g);
        if (s.lineHeight) classes += ` leading-[${s.lineHeight}]`;

        // Letter Spacing
        removeClass(/\btracking-\[.*?\]\b/g);
        removeClass(/\btracking-(tighter|tight|normal|wide|wider|widest)\b/g);
        if (s.letterSpacing) classes += ` tracking-[${s.letterSpacing}px]`;

        // Text Align
        removeClass(/\btext-(left|center|right|justify)\b/g);
        if (s.textAlign && s.textAlign !== 'start') classes += ` text-${s.textAlign}`;

        // Opacity - must remove all variations
        removeClass(/\bopacity-\[[^\]]+\]/g);  // Matches opacity-[anything]
        removeClass(/\bopacity-\d+\b/g);       // Matches opacity-50, etc.
        if (s.opacity && s.opacity !== '100') classes += ` opacity-[${s.opacity}%]`;

        // Padding
        removeClass(/\bpx-\[.*?\]\b/g);
        removeClass(/\bpy-\[.*?\]\b/g);
        removeClass(/\bp[xy]-\d+\b/g);
        if (s.paddingX) classes += ` px-[${s.paddingX}px]`;
        if (s.paddingY) classes += ` py-[${s.paddingY}px]`;

        // Margin
        removeClass(/\bmx-\[.*?\]\b/g);
        removeClass(/\bmy-\[.*?\]\b/g);
        removeClass(/\bm[xy]-\d+\b/g);
        if (s.marginX) classes += ` mx-[${s.marginX}px]`;
        if (s.marginY) classes += ` my-[${s.marginY}px]`;

        // Display
        removeClass(/\b(flex|block|grid|inline|inline-flex|inline-block|inline-grid|hidden)\b/g);
        if (s.display) classes += ` ${s.display}`;

        // Flex Direction
        removeClass(/\bflex-(row|row-reverse|col|col-reverse)\b/g);
        if (s.flexDirection && s.display?.includes('flex')) classes += ` ${s.flexDirection}`;

        // Justify Content
        removeClass(/\bjustify-(start|end|center|between|around|evenly)\b/g);
        if (s.justifyContent && (s.display?.includes('flex') || s.display?.includes('grid'))) {
            classes += ` ${s.justifyContent}`;
        }

        // Align Items
        removeClass(/\bitems-(start|end|center|baseline|stretch)\b/g);
        if (s.alignItems && (s.display?.includes('flex') || s.display?.includes('grid'))) {
            classes += ` ${s.alignItems}`;
        }

        // Gap
        removeClass(/\bgap-\[.*?\]\b/g);
        removeClass(/\bgap-\d+\b/g);
        if (s.gap && (s.display?.includes('flex') || s.display?.includes('grid'))) {
            classes += ` gap-[${s.gap}px]`;
        }

        // Shadow
        removeClass(/\bshadow(-sm|-md|-lg|-xl|-2xl|-inner|-none)?\b/g);
        if (s.shadowSize) {
            // Using Tailwind arbitrary shadow with color
            const shadowValue = `0 4px ${s.shadowSize}px ${s.shadowColor}40`; // 40 is alpha in hex
            classes += ` shadow-[${shadowValue}]`;
        }

        // Border Width
        removeClass(/\bborder(-[0-9]+)?\b/g);
        removeClass(/\bborder-\[.*?\]\b/g);
        if (s.borderWidth) classes += ` border-[${s.borderWidth}px]`;

        // Border Color
        removeClass(/\bborder-\[#\w+\]\b/g);
        if (s.borderColor && s.borderWidth) classes += ` border-[${s.borderColor}]`;

        // Border Style
        removeClass(/\bborder-(solid|dashed|dotted|double|none)\b/g);
        if (s.borderStyle && s.borderWidth) classes += ` border-${s.borderStyle}`;

        // Border Radius
        removeClass(/\brounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?\b/g);
        removeClass(/\brounded-\[.*?\]\b/g);
        if (s.borderRadius) classes += ` rounded-[${s.borderRadius}px]`;

        // Background Color
        removeClass(/\bbg-\[#\w+\]\b/g);
        removeClass(/\bbg-(black|white|gray|red|blue|green|yellow|purple|pink|indigo|cyan|teal|orange|lime|emerald|sky|violet|fuchsia|rose|amber|slate|zinc|neutral|stone)(-\d+)?\b/g);
        if (s.backgroundColor) classes += ` bg-[${s.backgroundColor}]`;

        // Background Image
        removeClass(/\bbg-\[url\([^)]+\)\]\b/g);
        if (s.backgroundImage && s.backgroundImage.startsWith('url(')) {
            // Extract URL from url(...)
            const urlMatch = s.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (urlMatch) {
                classes += ` bg-[url(${urlMatch[1]})]`;
            }
        } else if (s.backgroundImage) {
            classes += ` bg-[url(${s.backgroundImage})]`;
        }

        return classes.replace(/\s+/g, ' ').trim();
    };

    if (!selectedElement) return null;

    return (
        <Card className="fixed right-4 top-4 h-[calc(100vh-2rem)] w-96 shadow-2xl z-[10000] flex flex-col bg-background border-border" data-editor-ui="true">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
                <CardTitle className="text-sm font-medium">Style Editor</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 -mr-2">
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <Tabs defaultValue="typography" className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-10">
                    <TabsTrigger value="typography" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Typography
                    </TabsTrigger>
                    <TabsTrigger value="layout" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Layout
                    </TabsTrigger>
                    <TabsTrigger value="spacing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Spacing
                    </TabsTrigger>
                    <TabsTrigger value="other" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
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

                    <TabsContent value="other" className="mt-0 p-4 space-y-4">
                        {/* Background */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground">Background</h4>

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

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Image URL</Label>
                                <Input
                                    type="text"
                                    value={pendingStyles.backgroundImage}
                                    onChange={(e) => handleChange('backgroundImage', e.target.value)}
                                    className="h-9 bg-background border-input"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Image Source - only show for IMG elements */}
                        {selectedElement?.tagName === 'IMG' && (
                            <>
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-muted-foreground">Image</h4>

                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Source URL</Label>
                                        <Input
                                            type="text"
                                            value={pendingStyles.imageSrc}
                                            onChange={(e) => handleChange('imageSrc', e.target.value)}
                                            className="h-9 bg-background border-input"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                </div>

                                <Separator />
                            </>
                        )}

                        {/* Shadow */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground">Shadow</h4>

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
                                            value={pendingStyles.shadowColor}
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
                            <h4 className="text-sm font-semibold text-muted-foreground">Border</h4>

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
}
