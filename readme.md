# Find an existing flow in the project

## Project Description

Create a tracker system that scans through the current codebase and finds the flow of any variable, function, or import in a React repository.

In the script, you will be given a string as input. You will have to find its usage in the current project and determine the complete flow of that variable, including where it has been used. For example, if the input is "axios", your script should provide every flow where "axios" has been used, along with the usage of its functions. This process should be repeated until the usage of any node doesn't end in the UI part.

## Project Structure

This JavaScript script analyzes a React repository to find the flow of a given input variable. It uses various modules and functions to traverse the files, parse the code, and construct a directed graph representing the variable flow.

Let's go through the script step by step:

1. The script starts by importing several modules using the `require` function. These modules include 'fs' for file system operations, 'path' for path-related operations, '@babel/parser' for parsing JavaScript code, '@babel/traverse' for traversing the Abstract Syntax Tree (AST), and '@dagrejs/graphlib' for creating a directed graph.

2. Next, there is a function declaration named `findVariableFlow` that takes two parameters: `input` (the variable to analyze) and `dir` (the root directory of the React repository). This function is responsible for finding the flow of the input variable in the repository.

3. Inside the `findVariableFlow` function, a new directed graph is created using the `Graph` constructor from the '@dagrejs/graphlib' module.

4. The `parseReactRepository` function is called to obtain a list of files in the React repository. This function recursively traverses the directory and collects all JavaScript and JSX files.

5. A loop iterates over each file in the repository to analyze the variable flow. It reads the file contents using `fs.readFileSync` and then parses the file contents into an Abstract Syntax Tree (AST) using `@babel/parser`.

6. The `traverse` function from `@babel/traverse` is used to traverse the AST and find the usage of the input variable. The `isMatch` function is called to determine if a specific AST node matches the input variable.

7. If a match is found, the current file is added as a node in the graph using the `createNode` function. The file is also added to the `selectedFiles` array to keep track of processed files.

8. If the matched identifier is part of an import statement, the resolved file path is obtained using the `resolveFilePath` function, and an edge is added between the current file node and the imported file node in the graph.

9. If the matched identifier is used in a function or variable declaration, the corresponding code block is extracted from the file contents using the node's start and end positions. The code block is then appended to the `code` property of the current file node in the graph.

10. After processing all files, the variable flow is determined by performing a depth-first search (DFS) on the graph starting from each selected file. The `recursiveDFS` function is responsible for performing the DFS and returning the variable flow information.

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
