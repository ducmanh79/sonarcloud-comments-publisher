# SonarCloud PR Comments Action

A GitHub Action that automatically posts SonarCloud issues as comments on your pull requests, helping you catch code quality issues early in the development process.

## Features

- 🔍 Fetches issues from SonarCloud analysis for your pull request
- 💬 Posts detailed comments directly on the affected lines in your PR
- 🎯 Only comments on files that are part of the pull request
- 📊 Creates a comprehensive review summary
- 🚫 Automatically requests changes when issues are found
- ✅ Gracefully handles PRs with no issues

## Usage

### Basic Setup

Add this action to your workflow file (e.g., `.github/workflows/sonar-pr-review.yml`):

```yaml
name: SonarCloud PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  sonar-pr-review:
    runs-on: ubuntu-latest
    steps:
      - name: Post SonarCloud Issues as PR Comments
        uses: ducmanh79/sonar-pr-comments@v1
        with:
          pr-number: ${{ github.event.pull_request.number }}
          project-key: ${{ secrets.SONAR_PROJECT_KEY }}
          sonar-token: ${{ secrets.SONAR_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Complete Workflow Example

Here's a complete workflow that runs SonarCloud analysis and then posts the results as PR comments:

```yaml
name: SonarCloud Analysis and PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches:
      - main

jobs:
  sonarcloud:
    name: SonarCloud Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Shallow clones should be disabled for better analysis

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      - name: Post SonarCloud Issues as PR Comments
        if: github.event_name == 'pull_request'
        uses: ducmanh79/sonar-pr-comments@v1
        with:
          pr-number: ${{ github.event.pull_request.number }}
          project-key: ${{ secrets.SONAR_PROJECT_KEY }}
          sonar-token: ${{ secrets.SONAR_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

> **⚠️ Important Note**: The SonarCloud scanning setup varies significantly across different project types and technologies. The example above shows a basic configuration, but you may need to adapt it based on your specific requirements:
> 
> - **Java projects**: May require Maven/Gradle build steps before scanning
> - **Node.js projects**: May need `npm install` and test coverage generation
> - **Multi-language projects**: May require specific build tools and configurations
> - **Custom analysis parameters**: May need additional sonar-project.properties or scanner parameters
> 
> Please refer to the [SonarCloud documentation](https://docs.sonarcloud.io/getting-started/github/) for setup instructions specific to your technology stack.

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `pr-number` | Pull request number | ✅ Yes | - |
| `project-key` | SonarCloud project key | ✅ Yes | - |
| `sonar-token` | SonarCloud authentication token | ✅ Yes | - |
| `github-token` | GitHub token for API access | ✅ Yes | - |

## Required Secrets

You need to set up the following secrets in your GitHub repository:

### `SONAR_TOKEN`
1. Go to [SonarCloud](https://sonarcloud.io)
2. Navigate to **My Account** → **Security**
3. Generate a new token
4. Add it as a repository secret named `SONAR_TOKEN`

### `SONAR_PROJECT_KEY`
1. Find your project key in SonarCloud (visible in your project dashboard)
2. Add it as a repository secret named `SONAR_PROJECT_KEY`

### `GITHUB_TOKEN`
This is automatically provided by GitHub Actions. No additional setup required.

## How It Works

1. **Fetches Issues**: The action queries SonarCloud's API to get all unresolved issues for the specific pull request
2. **Filters Relevant Files**: Only considers issues in files that are part of the current pull request
3. **Creates Line Comments**: Posts comments directly on the affected lines with:
   - Issue severity level
   - Detailed message from SonarCloud
   - Direct link to view the issue in SonarCloud
4. **Review Summary**: Creates a pull request review with an overview of all found issues
5. **Requests Changes**: Automatically marks the PR as "Request Changes" if issues are found

## Example Output

When issues are found, the action will:

- Create inline comments like:
  ```
  🔍 SonarCloud Issue (MAJOR): Remove this unused import of 'java.util.List'.
  
  [View in SonarCloud](https://sonarcloud.io/project/issues?id=your-project&issues=ABC123&open=ABC123)
  ```

- Add a review summary:
  ```
  ## SonarCloud Review
  
  Found 3 issues in your code that need to be addressed.
  
  Please review and fix the identified issues to improve your code quality.
  ```

## Permissions

Make sure your GitHub token has the following permissions:
- `contents: read`
- `pull-requests: write`

## Troubleshooting

### Common Issues

**No comments appear on PR**
- Verify that your SonarCloud project key is correct
- Ensure the SonarCloud analysis has completed before this action runs
- Check that the pull request number is correctly passed
- **Verify your SonarCloud scanning setup**: Different project types require different scanning configurations

**API authentication errors**
- Verify your `SONAR_TOKEN` is valid and not expired
- Ensure the token has the necessary permissions in SonarCloud

**Issues not matching files**
- The action only comments on files that are part of the PR changes
- Make sure your SonarCloud project is analyzing the correct branch

**SonarCloud analysis not running properly**
- **Different project setups require different scanning approaches**: Make sure your workflow includes the necessary build steps for your technology stack
- Check SonarCloud logs to ensure the analysis completed successfully
- Verify that your `sonar-project.properties` file (if used) is correctly configured

### Debug Information

The action provides detailed logs including:
- Number of issues fetched from SonarCloud
- Which files are being processed
- Number of comments created

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/ducmanh79/sonar-pr-comments/issues) on GitHub.