module.exports = function ({ types: t }) {
    return {
        visitor: {
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

                // add data-component
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
            },
        },
    };
};
