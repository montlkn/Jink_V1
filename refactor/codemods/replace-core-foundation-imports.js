export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.ImportDeclaration)
    .filter((path) =>
      /src\/(constants|utils|helpers|theme|routes|format)/.test(path.node.source.value)
    )
    .forEach((path) => {
      path.node.source.value = path.node.source.value.replace(
        /.*src\/(constants|utils|helpers|theme|routes|format)\/?/,
        "@jink/core-foundation/"
      );
    });

  return root.toSource({ quote: "single" });
}
