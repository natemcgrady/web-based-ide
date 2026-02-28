"use client";

import Editor from "@monaco-editor/react";

type MonacoPaneProps = {
  path: string;
  value: string;
  onChange: (value: string) => void;
};

function detectLanguage(path: string) {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) {
    return "typescript";
  }
  if (path.endsWith(".js") || path.endsWith(".jsx")) {
    return "javascript";
  }
  if (path.endsWith(".json")) {
    return "json";
  }
  if (path.endsWith(".css")) {
    return "css";
  }
  if (path.endsWith(".html")) {
    return "html";
  }
  if (path.endsWith(".md")) {
    return "markdown";
  }
  return "plaintext";
}

export function MonacoPane({ path, value, onChange }: MonacoPaneProps) {
  return (
    <Editor
      key={path}
      path={path}
      value={value}
      language={detectLanguage(path)}
      height="100%"
      theme="vs-dark"
      options={{
        minimap: { enabled: true },
        fontSize: 13,
        fontLigatures: true,
        smoothScrolling: true,
        automaticLayout: true,
      }}
      onChange={(nextValue) => onChange(nextValue ?? "")}
    />
  );
}
