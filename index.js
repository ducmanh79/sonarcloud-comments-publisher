const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');

async function run() {
  try {
    // Get inputs from action
    const projectKey = core.getInput('project-key', { required: true });
    const sonarToken = core.getInput('sonar-token', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const prNumber = parseInt(core.getInput('pr-number', { required: true }));
    
    // Initialize Octokit client
    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    
    // Start the process
    core.info(`Fetching SonarCloud issues for project ${projectKey}...`);
    
    // Fetch issues from SonarCloud
    const issues = await fetchSonarIssues(sonarToken, projectKey, prNumber);
    
    if (!issues) {
      core.setFailed('Failed to fetch issues from SonarCloud');
      return;
    }
    
    if (issues.length === 0) {
      core.info('No issues found in SonarCloud analysis. Great job!');
      return;
    }
    
    core.info(`Found ${issues.length} issues to review.`);
    
    // Create pull request review with comments for each issue
    await createPullRequestReview(octokit, context, prNumber, issues, projectKey);
    
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

async function fetchSonarIssues(sonarToken, projectKey, pullRequest) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://sonarcloud.io/api/issues/search?componentKeys=${projectKey}&pullRequest=${pullRequest}&resolved=false`;
    
    const options = {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${sonarToken}:`).toString('base64')}`
      }
    };
    
    const req = https.get(apiUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`SonarCloud API request failed with status code ${res.statusCode}`));
        }
        
        try {
          const response = JSON.parse(data);
          resolve(response.issues);
        } catch (error) {
          reject(new Error(`Failed to parse SonarCloud API response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function createPullRequestReview(octokit, context, prNumber, issues, projectKey) {
  // Get PR files first to know which files are part of the PR
  const prFilesResponse = await octokit.rest.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber
  });
  
  const prFiles = prFilesResponse.data.map(file => file.filename);
  
  // Group comments by file
  const commentsByFile = {};
  
  issues.forEach(issue => {
    const file = issue.component.replace(`${projectKey}:`, '');
    const line = issue.line || null;
    
    // Skip if file is not part of the PR
    if (!prFiles.includes(file)) {
      return;
    }
    
    if (!commentsByFile[file]) {
      commentsByFile[file] = [];
    }
    
    commentsByFile[file].push({
      path: file,
      line: line,
      body: `🔍 **SonarCloud Issue (${issue.severity})**: ${issue.message}\n\n[View in SonarCloud](https://sonarcloud.io/project/issues?id=${projectKey}&issues=${issue.key}&open=${issue.key})`
    });
  });
  
  // Flatten comments into a single array
  const comments = [];
  Object.values(commentsByFile).forEach(fileComments => {
    comments.push(...fileComments);
  });
  
  // Only proceed if we have comments to add
  if (comments.length > 0) {
    try {
      // Create review with comments
      await octokit.rest.pulls.createReview({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber,
        event: 'REQUEST_CHANGES',
        comments: comments,
        body: `## SonarCloud Review\n\nFound ${comments.length} issues in your code that need to be addressed.\n\nPlease review and fix the identified issues to improve your code quality.`
      });
      
      core.info(`Created PR review with ${comments.length} comments`);
    } catch (error) {
      core.setFailed(`Failed to create PR review: ${error.message}`);
    }
  } else {
    core.info(`No comments to add to PR review - no issues found in PR files`);
  }
}

run();