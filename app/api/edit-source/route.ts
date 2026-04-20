
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

export async function POST(req: Request) {
    try {
        const { filePath, line, column, newValue, type, attributeName } = await req.json();

        if (!filePath || line === undefined || column === undefined) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const fullPath = path.resolve(process.cwd(), filePath);

        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const code = fs.readFileSync(fullPath, 'utf-8');

        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript', 'decorators-legacy'],
        });

        let found = false;

        // @ts-ignore
        const traverseFn = traverse.default || traverse;
        traverseFn(ast, {
            JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
                const node = path.node;
                if (
                    node.loc &&
                    node.loc.start.line === Number(line) &&
                    node.loc.start.column === Number(column)
                ) {
                    found = true;

                    if (type === 'text') {
                        // Find the parent JSXElement
                        const jsxElement = path.parentPath.node as t.JSXElement;

                        // Simple case: Replace children with a single text node
                        // This might destroy other children, but for this demo it's acceptable behavior "update content"
                        jsxElement.children = [t.jsxText(newValue)];
                    } else if (type === 'image-src') {
                        // Find src attribute
                        const attributes = node.attributes;
                        let srcAttr = attributes.find(
                            (attr: t.JSXAttribute | t.JSXSpreadAttribute) =>
                                t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                attr.name.name === 'src'
                        ) as t.JSXAttribute | undefined;

                        if (srcAttr) {
                            srcAttr.value = t.stringLiteral(newValue);
                        } else {
                            // Add src attribute if not exists
                            node.attributes.push(
                                t.jsxAttribute(t.jsxIdentifier('src'), t.stringLiteral(newValue))
                            );
                        }
                    } else if (type === 'update-attribute') {
                        // Generic attribute update (e.g. className)
                        if (!attributeName) {
                            throw new Error('attributeName is required for update-attribute type');
                        }

                        const attributes = node.attributes;
                        let targetAttr = attributes.find(
                            (attr: t.JSXAttribute | t.JSXSpreadAttribute) =>
                                t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                attr.name.name === attributeName
                        ) as t.JSXAttribute | undefined;

                        if (targetAttr) {
                            targetAttr.value = t.stringLiteral(newValue);
                        } else {
                            // Add attribute if not exists
                            node.attributes.push(
                                t.jsxAttribute(t.jsxIdentifier(attributeName), t.stringLiteral(newValue))
                            );
                        }
                    }

                    path.stop();
                }
            },
            JSXText(path: NodePath<t.JSXText>) {
                const node = path.node;
                if (
                    node.loc &&
                    node.loc.start.line === Number(line) &&
                    node.loc.start.column === Number(column)
                ) {
                    found = true;

                    if (type === 'text') {
                        path.replaceWith(t.jsxText(newValue));
                    }

                    path.stop();
                }
            },
        });

        if (!found) {
            return NextResponse.json({ error: 'Node not found at specified location' }, { status: 404 });
        }

        // @ts-ignore
        const generateFn = generate.default || generate;
        const output = generateFn(ast, {}, code);

        // Write back to file
        fs.writeFileSync(fullPath, output.code);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
