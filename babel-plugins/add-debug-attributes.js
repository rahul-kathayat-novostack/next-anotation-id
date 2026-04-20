module.exports = function ({ types: t }) {
    return {
        visitor: {
            JSXElement(path) {
                const children = path.node.children;
                if (!children || children.length <= 1) return;

                let hasChanges = false;
                const newChildren = children.map(child => {
                    if (t.isJSXText(child) && child.value.trim().length > 0) {
                        // Wrap text in span if it's part of a mixed/multiple content
                        const span = t.jsxElement(
                            t.jsxOpeningElement(t.jsxIdentifier('span'), []),
                            t.jsxClosingElement(t.jsxIdentifier('span')),
                            [child],
                            false
                        );

                        // Transfer location
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

                // component name
                const componentName =
                    path.findParent((p) => p.isFunctionDeclaration() || p.isVariableDeclarator())
                        ?.node?.id?.name || "Anonymous";

                // source filename
                const filePath = state.file.opts.filename || "";
                const relativePath = filePath.replace(process.cwd() + "/", "");

                // line number (JSX element start)
                const line = node.loc?.start?.line || null;
                // add data-editable if not present
                const hasEditable = node.attributes.some(
                    (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-editable"
                );

                if (!hasEditable) {
                    // add data-component
                    node.attributes.push(
                        t.jsxAttribute(
                            t.jsxIdentifier("data-editable"),
                            t.stringLiteral("true")
                        )
                    );
                    node.attributes.push(
                        t.jsxAttribute(
                            t.jsxIdentifier("data-component"),
                            t.stringLiteral(componentName)
                        )
                    );

                    // add data-source-file
                    node.attributes.push(
                        t.jsxAttribute(
                            t.jsxIdentifier("data-source-file"),
                            t.stringLiteral(relativePath)
                        )
                    );

                    // add data-line
                    if (line) {
                        node.attributes.push(
                            t.jsxAttribute(
                                t.jsxIdentifier("data-line"),
                                t.stringLiteral(String(line))
                            )
                        );
                    }

                    // add data-col
                    const column = node.loc?.start?.column;
                    if (column !== undefined && column !== null) {
                        node.attributes.push(
                            t.jsxAttribute(
                                t.jsxIdentifier("data-col"),
                                t.stringLiteral(String(column))
                            )
                        );
                    }
                }

            },
        },
    };
};
