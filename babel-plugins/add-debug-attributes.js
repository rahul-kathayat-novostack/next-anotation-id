module.exports = function ({ types: t }) {
    return {
        visitor: {
            JSXElement(path) {
                const children = path.node.children;
                if (!children || children.length <= 1) return;

                let hasChanges = false;
                const newChildren = children.map(child => {
                    if (t.isJSXText(child) && child.value.trim().length > 0) {
                        const span = t.jsxElement(
                            t.jsxOpeningElement(t.jsxIdentifier('span'), []),
                            t.jsxClosingElement(t.jsxIdentifier('span')),
                            [child],
                            false
                        );

                        if (child.loc) {
                            span.openingElement.loc = child.loc;
                        }

                        hasChanges = true;
                        return span;
                    }
                    return child;
                });

                if (hasChanges) {
                    path.node.children = newChildren;
                }
            },
            JSXOpeningElement(path, state) {
                const node = path.node;

                // 1. Get source filename
                const filePath = state.file.opts.filename || "";
                const relativePath = filePath.replace(process.cwd() + "/", "");

                // IGNORE UI LIBRARY COMPONENTS
                if (relativePath.includes('components/ui/')) {
                    return;
                }

                // 3. Get component name
                const componentName =
                    path.findParent((p) => p.isFunctionDeclaration() || p.isVariableDeclarator())
                        ?.node?.id?.name || "Anonymous";

                // 4. Add data attributes if not already present
                const hasEditable = node.attributes.some(
                    (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-editable"
                );

                if (!hasEditable) {
                    // data-editable="true"
                    node.attributes.push(
                        t.jsxAttribute(t.jsxIdentifier("data-editable"), t.stringLiteral("true"))
                    );

                    // data-component="..."
                    node.attributes.push(
                        t.jsxAttribute(t.jsxIdentifier("data-component"), t.stringLiteral(componentName))
                    );

                    // data-source-file="..."
                    node.attributes.push(
                        t.jsxAttribute(t.jsxIdentifier("data-source-file"), t.stringLiteral(relativePath))
                    );

                    // data-line / data-col
                    if (node.loc) {
                        node.attributes.push(
                            t.jsxAttribute(t.jsxIdentifier("data-line"), t.stringLiteral(String(node.loc.start.line)))
                        );
                        node.attributes.push(
                            t.jsxAttribute(t.jsxIdentifier("data-col"), t.stringLiteral(String(node.loc.start.column)))
                        );
                    }
                }
            },
        },
    };
};
