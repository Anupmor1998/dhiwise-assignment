# Find an existing flow in the project

## Project Description

Create a tracker system that scans through the current codebase and finds the flow of any variable, function, or import in a React repository.

In the script, you will be given a string as input. You will have to find its usage in the current project and determine the complete flow of that variable, including where it has been used. For example, if the input is "axios", your script should provide every flow where "axios" has been used, along with the usage of its functions. This process should be repeated until the usage of any node doesn't end in the UI part.

## Project Structure

This JavaScript script analyzes a React repository to find the flow of a given input variable. It uses various modules and functions to traverse the files, parse the code, and construct a directed graph representing the variable flow.

Let's go through the script step by step:

1. The script starts by importing several modules using the `require` function. These modules include 'fs' for file system operations, 'path' for path-related operations, '@babel/parser' for parsing JavaScript code, '@babel/traverse' for traversing the Abstract Syntax Tree (AST), and '@dagrejs/graphlib' for creating a directed graph.

2. Next, there is a function declaration named `findVariableFlow` that takes two parameters: `input` (the variable to analyze) and `dir` (the root directory of the React repository). This function is responsible for finding the flow of the input variable in the repository.

   ```
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
   ```

3. Inside the `findVariableFlow` function, a new directed graph is created using the `Graph` constructor from the '@dagrejs/graphlib' module.

4. The `parseReactRepository` function is called to obtain a list of files in the React repository. This function recursively traverses the directory and collects all JavaScript and JSX files.

   ```
   function parseReactRepository(dir) {
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
   ```

5. A loop iterates over each file in the repository to analyze the variable flow. It reads the file contents using `fs.readFileSync` and then parses the file contents into an Abstract Syntax Tree (AST) using `@babel/parser`.

6. The `traverse` function from `@babel/traverse` is used to traverse the AST and find the usage of the input variable. The `isMatch` function is called to determine if a specific AST node matches the input variable.

   ```
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
   ```

7. If a match is found, the current file is added as a node in the graph using the `createNode` function. The file is also added to the `selectedFiles` array to keep track of processed files.

   ```
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
   ```

8. If the matched identifier is part of an import statement, the resolved file path is obtained using the `resolveFilePath` function, and an edge is added between the current file node and the imported file node in the graph.

   ```
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
   ```

9. If the matched identifier is used in a function or variable declaration, the corresponding code block is extracted from the file contents using the node's start and end positions. The code block is then appended to the `code` property of the current file node in the graph.

10. After processing all files, the variable flow is determined by performing a depth-first search (DFS) on the graph starting from each selected file. The `recursiveDFS` function is responsible for performing the DFS and returning the variable flow information.

    ```
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
    ```

11. The variable flow information is collected in the `variableFlow` object by merging the results from each selected file.

12. Finally, an example usage of the script is provided. The input variable is set to `'categories'`, and the root directory of the React repository is specified. The `srcDir` variable is derived from the root directory by appending '/src'. The `findVariableFlow` function is called with the input variable and source directory, and the resulting variable flow is logged to the console.

That's an overview of the provided script. It analyzes a React repository to find the flow of a given input variable by constructing a directed graph and performing a depth-first search.

## How to Run

To run the script, you need to have Node.js installed on your system. You can download and install Node.js from [nodejs.org](https://nodejs.org/en/).

before running the script, you have to replace the `rootDir` variable value with your React Project root directory and `inputVariable` value with desired variable name whose flow you want to find.

after that, you can run the script using the following command:

```bash
node index.js
```

The script will analyze the React repository and print the variable flow information to the console.
