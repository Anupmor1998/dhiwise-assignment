const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { Graph } = require('@dagrejs/graphlib');

// Function to find the variable flow
function findVariableFlow(input, dir) {
  // Create a new directed graph
  const graph = new Graph({ directed: true });

  // Parse the React repository to obtain the list of files
  const files = parseReactRepository(dir);
  const selectedFiles = [];

  // Traverse each file to find the flow of the input variable
  for (const file of files) {
    // Read the file contents
    const fileContents = fs.readFileSync(file, 'utf8');
    try {
      // Parse the file contents using @babel/parser
      const ast = parse(fileContents, {
        sourceType: 'module',
        plugins: ['jsx'],
      });

      // Traverse the AST to find the input variable's usage
      traverse(ast, {
        enter(path) {
          if (isMatch(input, path)) {
            // Add the current file as a node in the graph
            const currentNode = createNode(file, graph);
            selectedFiles.push(file);

            // Check if the identifier is part of an import statement
            if (path.isImportDeclaration()) {
              const importPath = path.get('source').node.value;
              const importFile = resolveFilePath(file, importPath);
              if (importFile) {
                const importNode = createNode(importFile, graph);
                graph.setEdge(currentNode, importNode);
              }
            }

            // Check if the identifier is used in a function or variable declaration
            if (path.isFunctionDeclaration() || path.isVariableDeclarator()) {
              const parentCodeBlock = path.findParent(
                (path) => path.isFunction() || path.isVariableDeclaration()
              );
              const code = fileContents.substring(
                parentCodeBlock.node.start,
                parentCodeBlock.node.end
              );

              graph.node(currentNode).code += `\n\n${code}`;
            }
          }
        },
      });
    } catch (error) {
      console.error(`Error parsing file: ${file}`);
      console.error(error);
    }
  }

  const variableFlow = {};
  for (const file of selectedFiles) {
    const nodeId = getNodeId(file);
    const fileFlow = recursiveDFS(graph, nodeId);
    Object.assign(variableFlow, fileFlow);
  }

  // Return the variable flow information
  return variableFlow;
}

// Function to check if the input matches the path
function isMatch(input, path) {
  const node = path.node;

  // Check for variable assignments and references
  if (
    (path.isVariableDeclarator() || path.isAssignmentExpression()) &&
    path.get('id').isIdentifier({ name: input })
  ) {
    return true;
  }

  // Check for function names
  if (path.isFunctionDeclaration() && node.id && node.id.name === input) {
    return true;
  }

  // Check for import names
  if (
    path.isImportDeclaration() &&
    node.source &&
    node.source.value === input
  ) {
    return true;
  }

  // Check for variable references
  if (
    path.isReferencedIdentifier() &&
    node.name === input &&
    !path.findParent((p) => p.isImportDeclaration())
  ) {
    return true;
  }

  return false;
}

// Function to parse the React repository
function parseReactRepository(dir) {
  // Provide the root directory of your React repository

  // Recursively traverse the directory and collect all JavaScript and JSX files
  const files = [];

  function traverseDirectory(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  traverseDirectory(dir);
  return files;
}

function resolveFilePath(currentFile, importPath) {
  const fileExtensions = ['.js', '.jsx', '.ts', '.tsx'];

  for (const extension of fileExtensions) {
    const filePath = path.resolve(
      path.dirname(currentFile),
      importPath + extension
    );

    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

// Function to create a node in the graph for a file
function createNode(file, graph) {
  const nodeId = getNodeId(file);
  if (!graph.hasNode(nodeId)) {
    const node = {
      file,
      code: '',
    };
    graph.setNode(nodeId, node);
  }
  return nodeId;
}

// Function to generate a unique ID for a file
function getNodeId(filePath) {
  return path.relative(srcDir, filePath);
}

// Function for recursive depth-first search on the graph
function recursiveDFS(graph, node) {
  const visited = new Set();
  const result = {};

  function dfs(currentNode) {
    if (visited.has(currentNode)) {
      return;
    }

    visited.add(currentNode);
    const successors = graph.successors(currentNode);

    if (successors && successors.length > 0) {
      for (const successor of successors) {
        result[successor] = {
          code: graph.node(successor).code,
          file: graph.node(successor).file,
        };
        dfs(successor);
      }
    } else {
      result[currentNode] = {
        code: graph.node(currentNode).code || '',
        file: graph.node(currentNode).file || null,
      };
    }
  }

  dfs(node);
  return result;
}

// Example usage of the script
const inputVariable = 'categories';
const rootDir = 'D:/curio-ventures/numee_web_app_develop';
const srcDir = path.join(rootDir, 'src');
const variableFlow = findVariableFlow(inputVariable, srcDir);
console.log('Variable Flow:', variableFlow);
