# Sortier for Visual Studio Code

Visual Studio Code extension that allows you to run 
[Sortier](https://github.com/snowcoders/sortier) from the IDE

Sortier is an opinionated code sorter similar to how Prettier is a opinionated code formatter. Given a file, it parses then figures out how to sort and rearrange source code in a consistent way.

Examples of what sortier will sort:
 - Import statements
 - Import specifiers
 - Union types
 - Keys and properties within objects and types
 - And more!

It should work with JavaScript ES6, Flow and Typescript but if you find a piece of code that doesn't sort the way you expect it to, feel free to open an issue in Github!

For more information about Sortier, go to https://github.com/snowcoders/sortier

## Run it

1. Show all commands
 - Windows - F1 or Ctrl + Shift + P
 - Mac - Ctrl + Cmd + P
2. Run `Sortier`

## Extension Settings
#### sortier.onSave (default: false)
Runs sortier on save of any file
