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

            // Check if the identifier is part of an import statement
            if (path.isImportDeclaration()) {
              const importPath = path.get('source').node.value;
              const importFile = resolveFilePath(file, importPath);
              console.log(importFile, 'importFile');
              if (importFile) {
                const importNode = createNode(importFile, graph);
                graph.setEdge(currentNode, importNode);
              }
            }

            // Check if the identifier is used in a function or variable assignment
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
  console.log('Graph Nodes:');
  const nodes = graph.nodes();
  for (const node of nodes) {
    console.log(node, graph.node(node));
  }

  console.log('Graph Edges:');
  const edges = graph.edges();
  for (const edge of edges) {
    console.log(edge, graph.edge(edge));
  }
  // Perform a recursive depth-first search on the graph
  const variableFlow = recursiveDFS(graph, getNodeId(files[0]));

  // Return the variable flow information
  return variableFlow;
}

// Function to check if the input matches the path
// Updated isMatch function
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

// Helper function to resolve the file path based on the current file's directory
// function resolveFilePath(currentFile, importPath) {
//   const importFile = path.resolve(path.dirname(currentFile), importPath);
//   return fs.existsSync(importFile) ? importFile : null;
// }

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

    if (successors) {
      for (const successor of successors) {
        const edge = graph.edge(currentNode, successor);
        result[successor] = {
          code: graph.node(successor).code,
          imports: edge ? edge.imports : [],
        };
        dfs(successor);
      }
    }
  }

  dfs(node);
  return result;
}

// Example usage of the script
const inputVariable = 'axios';
const rootDir = 'D:/curio-ventures/numee_web_app_develop';
const srcDir = path.join(rootDir, 'src');
const variableFlow = findVariableFlow(inputVariable, srcDir);
console.log('Variable Flow:', variableFlow);
