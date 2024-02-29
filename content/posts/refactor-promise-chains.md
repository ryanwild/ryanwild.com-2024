+++
title = "Refactoring JavaScript Promise chains"
date = "2022-01-02"
toc = true
+++

## Introduction

I wrote some code a while ago, it works well and outputs the correct result but I honestly hate the style.

See here:

```js
const collectFiles = async (dir, collected = []) => {
const files = await fs.readdir(dir)
  .then((list) => (
    list.map(file => resolve(dir, file))
  ))
  .then((list) => (
    Promise.all(
      list.map(async (file) => {
        const stat = await fs.stat(file);
          return { file, stat };
      })
    )
  ))
  .then((list) => (
    Promise.all(
      list.map(async (item) => {
        if (item.stat.isDirectory()) {
            list.push(
              await collectFiles(item.file, collected)
            );
        }
        return item;
      })
    )
  ))
  .then((list) => (
    list
      .filter(({ stat }) => stat.isFile())
      .filter(({ file }) => file.endsWith(".md"))
      .map(({ file }) => file)
  ));

  collected.push(...files);
  return collected;
}
```

## Identifying Problems

The code works and is concise however it combines `async/await` with a promise chains.

Why does this irritate me?

The promise chain uses anonymous functions that have no context, this makes it hard to understand because at each phase you must read every line of code before it makes sense.

As the chain increases in size it becomes harder to understand.

Testing this code is painful but we could run the code against the file system and assert the desired result to save some time, not ideal.

## Getting Started

If you need to dig into the example checkout the GitHub [repo](https://github.com/ryanwild/js-async-study).

This will be a technical article so reading code from the repo is going to help you follow along, I recommend it.

First write a quick and dirty test function before we change anything:

```js
const test = async () => {
    let files = [];
    const directory = "./example";
    const expected = [
        "example/subfolder/super-secret.md",
        "example/one.md",
        "example/two.md"
    ].map(file => resolvePath(file));

    log(`Collecting files from: ${directory}`);

    try {
        files = await collectFiles(directory);
        log(`Result:`, files);
        assert(utilEquals(expected, files));
    } catch (err) {
        log(err);
    }
};

test();
```

Running this code will produce the following output:

```bash
$ node ./scratch.js
Collecting files from: ./example
Result: [
  '/home/beast/Projects/collect-files/example/subfolder/super-secret.md',
  '/home/beast/Projects/collect-files/example/one.md',
  '/home/beast/Projects/collect-files/example/two.md'
]
```

## Add Context to the Promise Chain

We can move each step within the promise chain to their own named function.

```js
const resolveFiles = (dir) => list => (
    list.map(filename => resolvePath(dir, filename))
);

const recurseSubDirectory = (collected) => (list) => (
    Promise.all(
        list.map(async (item) => {
            if (item.stat.isDirectory()) {
                list.push(
                    (await collectFiles(item.file, collected))
                );
            }
            return item;
        })
    )
);

const mapFileStats = (list) => (
    Promise.all(
        list.map(async (file) => {
            const stat = await fs.stat(file);
            return {
                file,
                stat,
            };
        })
    )
);

const onlyFiles = list => (
    list.filter(({ stat }) => stat.isFile())
);

const onlyFileType = list => (
    list.filter(({ file }) => file.endsWith(".md"))
);

const mapFile = list => list.map(({ file }) => file);


const collectFiles = async (dir, collected = []) => {
    const files = await fs.readdir(dir)
        .then(resolveFiles(dir))
        .then(mapFileStats)
        .then(recurseSubDirectory(collected))
        .then(onlyFiles)
        .then(onlyFileType)
        .then(mapFile);

    collected.push(...files);
    return collected;
}
```

Much better, the `collectFiles` function has clear context and each step can be tested individually.

But this code still bothers me, it combines `async/await` with the promise chain what else can we do?

## Remove the Promise Chain

Use `await` for each step:

```js
const collectFiles = async (dir, collected = []) => {
    let files = await fs.readdir(dir);
    files = resolveFiles(dir)(files);
    files = await mapFileStats(files);
    files = await recurseSubDirectory(collected)(files);
    files = onlyFiles(files);
    files = onlyFileType(files);
    files = mapFile(files);

    collected.push(...files);
    return collected;
}
```

Okay that is not too bad but looks like reduction.

Do we really have to reassign the `files` variable with each step?

Experience has taught me that often when you find yourself reassigning the same variable you can write a reducer to solve the same problem.

## Execute a List of Actions

Adding the reducer:

```js
const collectFiles = async (dir, collected = []) => {
    const inputDirectory = await fs.readdir(
        resolvePath(dir)
    );

    const actions = [
        fullFilePath(dir),
        mapFileStats,
        recurseSubDirectory(collected),
        onlyFiles,
        onlyFileType,
        mapFile,
    ];

    const files = await actions.reduce(
        async (list, action) => (
            action(await list)
        ),
        inputDirectory
    );

    collected.push(...files);
    return collected;
}
```

Now walk through these changes to understand.

We get a list of files from the `inputDirectory` using `fs.readdir`, it is `async` so we `await` the result.

Once we have the list of files, we need to take a series of actions to produce the desired output, we define an `array` of actions that need to be taken:

```js
const actions = [
    fullFilePath(dir),
    mapFileStats,
    recurseSubDirectory(collected),
    onlyFiles,
    onlyFileType,
    mapFile,
];
```

As you can see these are just the same references to the functions in the previous phase.

Now we can run these actions through a reducer to obtain the result:

```js
const files = await actions.reduce(
        async (list, action) => (
            action(await list)
        ),
    inputDirectory
);
```

The result is a `Promise` so we `await` the result from the beginning:

```js
const files = await actions.reduce ...
```

Next we define the reducer function:

```js
async (list, action) => (
    action(await list)
),
```

In some cases, the previous `list` parameter would have been a `Promise` so we flag the function as `async` and `await` the list value.

```js
action(await list)
```

## Take Away

In JavaScript `Promise` is a lower-level abstraction than `async/await`, try to avoid promise chains.

If you cannot work your way out of promises, at least break out the callbacks into named functions to give your code context and meaning.

## Bonus Round

Clean up some of the actions we can do better!

First things first, rename `dir` to `directory` abbreviations are awful and loose context for example is `dir` a directory or a `direction`?

I also hate the `dirent` abbreviation but this is a built in Node.js convention so to make it easier to cross reference with their documentation I will leave that as is.

```js
const filterFiles = (extension) => (list) => (
    list.filter(dirent =>
        (
            !extension &&
            dirent.isFile()
        ) ||
        (
            dirent.isFile() &&
            extension &&
            dirent.name.endsWith(extension)
        )
    )
);

const recurseSubDirectory = (directory, collected) => (list) => (
    Promise.all(
        list.map(async (dirent) => {
            if (dirent.isDirectory()) {
                list.push(
                    (await collectFiles(
                        resolvePath(directory, dirent.name),
                        collected
                    ))
                );
            }
            return dirent;
        })
    )
);

const mapFile = (directory) => list => (
    list.map(({ name }) => resolvePath(directory, name))
);

const collectFiles = async (directory, collected = []) => {
    const inputDirectory = await fs.readdir(
        resolvePath(directory),
        {
            withFileTypes: true
        }
    );

    const actions = [
        recurseSubDirectory(directory, collected),
        filterFiles(".md"),
        mapFile(directory),
    ];

    const files = await actions.reduce(
        async (list, action) => (
            action(await list)
        ),
        inputDirectory
    );
    collected.push(...files);
    return collected;
}
```

We can remove the need to call `fs.stat` by calling `fs.readdir` with the `withFileTypes: true` option.

This will return a `dirent` object instead of the file name `string` which already has the `isDirectory()` and `isFile()` functions.

```js
const inputDirectory = await fs.readdir(
    resolvePath(args.directory),
    {
        withFileTypes: true
    }
);
```

It would also be better to recurse sub directories as early as possible so update the actions array.

```js
const actions = [
    recurseSubDirectory(directory, collected), // first action called in the list
    filterFiles(".md"), // combined filter function to reduce looping over the array
    mapFile(directory),
];
```

Finally, we need to fix up some bugs from our changes so the `recurseSubDirectory` needed to resolve the input directory path.

```js
(await collectFiles(
    resolvePath(directory, dirent.name),
    collected
))
```

Lastly the file filtering functions can be combined into one:

```js
const filterFiles = (extension) => (list) => (
    list.filter(dirent =>
        (
            !extension &&
            dirent.isFile()
        ) ||
        (
            dirent.isFile() &&
            extension &&
            dirent.name.endsWith(extension)
        )
    )
);
```

## Conclusion

If you have made it this far thank you for following along.

Refactoring code is difficult and takes time, it is a good habit to do it every day in small chunks so that you minimize risk and increase iteration.

It is only through reading and rewriting code do we learn and find a better way to achieve the same results.

Always write a test case before making any changes, this is the law of refactoring without risk.

Remember that when you change function arguments you introduce a breaking change, search your code base to assess the impact this might have.
