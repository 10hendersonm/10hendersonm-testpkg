;(async () => {
  const fs = require('fs')
  const { execSync } = require('child_process')

  const { Octokit } = require('@octokit/rest')

  const [_node, _thisScript, action, fileName] = process.argv

  const actions = {
    save: async () => {
      const changelogDiff = execSync('git diff CHANGELOG.md', {
        encoding: 'utf-8',
      })

      const additionRegex = /^\+/
      const changelogAdditions = changelogDiff
        .split('\n') // evaluate each line
        .filter((line) => additionRegex.test(line)) // take only lines that begin with +
        .slice(1) // toss the first one (`+++ b/CHANGELOG.md`)
        .map((line) => line.replace(additionRegex, '')) // remove the leading `+`s
        .join('\n') // pull it all together

      fs.writeFileSync(fileName, changelogAdditions)
    },
    post: async () => {
      const { GITHUB_REPOSITORY, GH_TOKEN } = process.env

      const { owner, repo } =
        /^(?<owner>[^/]+)\/(?<repo>.*)$/.exec(GITHUB_REPOSITORY)?.groups || {}

      const releaseText = fs.readFileSync(fileName, {
        encoding: 'utf-8',
      })

      const currentTag = execSync('git tag --points-at HEAD', {
        encoding: 'utf-8',
      }).trim()

      const gh = new Octokit({ auth: GH_TOKEN })

      await gh.repos.createRelease({
        owner,
        repo,
        tag_name: currentTag,
        name: currentTag.replace(/^v/i, ''),
        body: releaseText,
      })
    },
  }

  if (actions[action]) {
    await actions[action]()
  } else {
    throw new Error(
      `Unrecognized action "${action}". Valid actions:\n${Object.keys(actions)
        .map((t) => `- ${t}`)
        .join('\n')}`,
    )
  }
})()
