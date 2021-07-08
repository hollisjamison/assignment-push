
// Import Axios for HTTP requests
const axios = require("axios");

// Import shelljs to run bash (git) commands
const shell = require("shelljs");

const token = process.env.TOKEN;
const githubUser = process.env.GITUSER;
const slackToken = process.env.SLACKTOKEN;

// Import Slack API to send messages to students
const { WebClient } = require("@slack/web-api");

const slack = new WebClient(slackToken);

function findRepoDetailsByName(repos, repoNames) {

  let allReposFiltered = [];
  repoNames.forEach(repoName => {
    let reposFiltered = repos.filter(repo => repo.name === repoName);
    if (reposFiltered.length === 1) {
      allReposFiltered.push(reposFiltered[0]);
    } else {
      console.log(`repo details for ${repoName} not found`);
    }
  })
  return allReposFiltered;
}

const checkRepo = (student, repoName, slackAlert, callback, failureCallBack) => {
  return axios.get(`https://github.com/${student.github}/${repoName}`)
    .then(
      (response) => {
        console.log(`\x1b[32m ${student.github} has made their '${repoName}' repo!`);
        if (callback) {
          callback();
        }
      },
      (error) => {
        if (slackAlert) {
          sendMessage(student.slack, repoName);
        }
        console.log(`\x1b[31m ${student.github} has not made their '${repoName}' repo yet.` + (slackAlert ? ' Alert sent.' : ''));
        if (failureCallBack) {
          failureCallBack();
        }
      }
    )
}

const checkReposContinuously = (studentList, reposSelected, i, slackAlert) => {
  // create for loop to check all student repos and see if they exist

  const repoName = reposSelected[i].name;

  console.log(`\n\x1b[33m ======= checking if '${repoName}' repo exists =======\n`);

  let promises = [];
  studentList.forEach((student) => {
    // Do an HTTP get on each students supposed repo
    promises.push(checkRepo(student, repoName, slackAlert));
  });

  // continue to next repo
  Promise.allSettled(promises).then((results) => {
    i++;
    if (reposSelected[i]) {
      checkReposContinuously(studentList, reposSelected, i, slackAlert);
    } else {
      console.log(`\n\x1b[33m =============== FINISHED ==============\n`);
    }

  });
};

const cloneAndPushRepos = (studentList, allSelectedRepos, i) => {

  let repoName = allSelectedRepos[i].name;
  let repoUrl = allSelectedRepos[i].url;

  console.log(`\n ==================================================`);
  console.log(`\n ===== Going to try cloning repo '${repoName}' ====`);

  let { stdoutClone, stderrClone, codeClone } = shell.exec(`git clone ${repoUrl}`, { silent: true });
  if (stderrClone) {
    console.log(`Could not clone ${repoUrl}`, stderrClone);
  }

  // Change branch to main as this is new Github default
  shell.cd(`${repoName}`);
  let { stdoutCheckout, stderrCheckout, codeCheckout } = shell.exec("git checkout -b main", { silent: true });
  if (stderrCheckout) {
    console.log(`Could not crete and switch to main branch`, stderrCheckout);
  }

  console.log(`\n ===== Going to try pushing repo '${repoName}' ====`);
  pushRepoToStudents(studentList, repoName, allSelectedRepos, i);

  shell.exec("cd ..");

  
}


const pushRepoToStudents = (studentList, repoName, allSelectedRepos, i) => {

  // Create a forloop to go through each student
  let repoCheckPromisesPerStudent = [];
  studentList.forEach((student) => {

    repoCheckPromisesPerStudent.push(checkRepo(student, repoName, false, () => {
      // First create a URL using the student's username and the repo name
      const studentUrl = `https://github.com/${student.github}/${repoName}.git`;

      // Force a push of the assignment main repo

      let { stdout, stderr, code } = shell.exec(`git push ${studentUrl}`, { silent: true }); //  --force
      if (stderr) {
        console.log(`\x1b[31m Could not push code to ${student.github} at ${studentUrl}. Error: ${stderr}`);
        //console.log(`\x1b[31m Could not push code to ${student.github} at ${studentUrl}, Maybe they have not yet made the repo yet or you are not collabator on it`);
      }
    }));

  });

  Promise.allSettled(repoCheckPromisesPerStudent).then((result) => {
    console.log(`\n \x1b[32m ============ FINISHED pushing ${repoName} ============`);

    // continue to next repo
    i++
    if (allSelectedRepos[i]) {
      cloneAndPushRepos(studentList, allSelectedRepos, i);
    }else{
      console.log(`\n\x1b[33m =============== FINISHED ==============\n`);
    }
  });
};

// Function to clone assignment locally
const setupRepos = (studentList, allSelectedRepos) => {

  // Setup github authentication so you have access to stack education
  shell.exec(`git config --global user.name "${githubUser}"`);
  shell.exec(`git config --global user.password "${token}"`);

  // First remove the repo folder and remake it empty
  shell.rm("-rf", "repo");
  shell.exec("mkdir repo");

  // Now clone the repo into repo folder
  shell.cd("repo");

  cloneAndPushRepos(studentList, allSelectedRepos, 0);
};


const sendMessage = (slackId, repoName) => {
  // Connect to slack and post the reminder message using the slackId provided.
  (async () => {
    const result = await slack.chat.postMessage({
      channel: slackId,
      text: `Your repo was not found. Please create the following repo on Github. If you have created the repo please check the spelling or make the repo public. \n \n *Repo Name:* \n \`${repoName}\` \n \n Then please add \`${githubUser}\` as a collaborator`,
    });
  })();
};
module.exports = { findRepoDetailsByName, setupRepos, checkReposContinuously }