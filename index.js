// Import Student List
const {
  studentList
} = require("./studentList");

let {
  repoDetails
} = require("./repos.js");

// Import inquirer to make shell interactive
const inquirer = require("inquirer");

// Import env file and all variables
const dotenv = require('dotenv')
dotenv.config();

const opt = { debug: true }
//const assignments = JSON.parse(dotenv.parse(Buffer.from(process.env.ASSIGNMENTS), opt)["REPOS"]);
const token = process.env.TOKEN;
const githubUser = process.env.GITUSER;
const slackToken = process.env.SLACKTOKEN;

// Import Axios for HTTP requests
const axios = require("axios");

// Import shelljs to run bash (git) commands
const shell = require("shelljs");

// Import Slack API to send messages to students
const {
  WebClient
} = require("@slack/web-api");
const slack = new WebClient(slackToken);

repoDetails = repoDetails.filter(repoDetail => !repoDetail.skip);

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

const checkReposContinuously = (reposSelected, i, slackAlert) => {
  // create for loop to check all student repos and see if they exist

  const repoName = reposSelected[i].name;

  console.log(`\x1b[33m ======= checking if '${repoName}' repo exists =======\n`);

  let promises = [];
  studentList.forEach((student) => {
    // Do an HTTP get on each students supposed repo
    promises.push(checkRepo(student, repoName, slackAlert));
  });

  // continue to next repo
  Promise.allSettled(promises).then((results) => {
    i++;
    if (reposSelected[i]) {
      checkReposContinuously(reposSelected, i, slackAlert);
    } else {
      console.log(`\n\x1b[33m =============== FINISHED ==============`);
    }

  });
};

const cloneAndPushAssignments = (allSelectedRepos, i) => {

  let repoName = allSelectedRepos[i].name;
  let repoUrl = allSelectedRepos[i].url;

  console.log(`\n ==================================================`);
  console.log(`\n===== Going to try cloning repo '${repoName}' ====`);

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

  console.log(`\n===== Going to try pushing repo '${repoName}' ====`);
  pushRepoToStudents(repoName, allSelectedRepos[i + 1]);

  shell.exec("cd ..");

  // continue to next repo
  i++
  if (allSelectedRepos[i]) {
    cloneAndPushAssignments(allSelectedRepos, i);
  }
}


const pushRepoToStudents = (repoName, hasNext) => {

  // Create a forloop to go through each student
  let promises = [];
  studentList.forEach((student) => {

    promises.push(checkRepo(student, repoName, false, () => {
      // First create a URL using the student's username and the repo name
      const studentUrl = `https://github.com/${student.github}/${repoName}.git`;

      // Force a push of the assignment main repo

      let { stdout, stderr, code } = shell.exec(`git push ${studentUrl} --force`, { silent: true });
      if (stderr) {
        console.log(`\x1b[31m Could not push code to ${student.github} at ${studentUrl}. Error: ${stderr}`);
        //console.log(`\x1b[31m Could not push code to ${student.github} at ${studentUrl}, Maybe they have not yet made the repo yet or you are not collabator on it`);
      }
    }));

  });

  Promise.allSettled(promises).then((result) => {
    if (!hasNext) {
      console.log(`\n \x1b[32m ============ FINISHED pushing ${repoName} ============`);
    }
  });
};

// Function to clone assignment locally
const setupRepos = (allSelectedRepos) => {

  // Setup github authentication so you have access to stack education
  shell.exec(`git config --global user.name "${githubUser}"`);
  shell.exec(`git config --global user.password "${token}"`);

  // First remove the repo folder and remake it empty
  shell.rm("-rf", "repo");
  shell.exec("mkdir repo");

  // Now clone the repo into repo folder
  shell.cd("repo");

  cloneAndPushAssignments(allSelectedRepos, 0);
};

// Function that controls interactivity
const promptUser = () => {
  // Prompt the user to see what kind of app needs to run
  inquirer
    .prompt([
      {
        name: "repoOptions",
        type: "checkbox",
        message: "Please select repos you want to check",
        choices: ["exit", "all", new inquirer.Separator()].concat(repoDetails),
        default: ["all"]
      },
      {
        name: "option",
        type: "list",
        message: "Please select your operation.",
        when: (answers) => {
          if (answers.repoOptions == "none" || !answers.repoOptions.length) {
            return false;
          }
          return true;
        },
        choices: [
          "1: Privately check if student repos exist. (No Slack message reminder).",
          "2: Check if student repos exist. (With Slack message reminder).",
          "3: Push assignment repo to students.",
          "4: Exit application.",
        ],
      },])
    // Then either check the repos or clone/push the assignment
    .then((answers) => {

      let reposSelectedByName = answers.repoOptions;
      let allReposFiltered = repoDetails;

      console.log(` Repos selected: ${answers.repoOptions}\n`);
      // If option 1 is selected so a silent check.
      if (reposSelectedByName == "exit") {
        return;

      } else if (!reposSelectedByName.length) {
        console.log(`\x1b[33m Nothing was selected, Exiting`);
        return;

      } else if (reposSelectedByName.indexOf("all") > -1) {
        if (reposSelectedByName.length > 1) {
          console.log(`\x1b[33m All Repos selected, will ignore other options`);
        }

      } else {
        let exitSelected = reposSelectedByName.indexOf("exit");
        if (exitSelected > -1 && reposSelectedByName.length > 1) {//dont really need to check size here again
          console.log(`\x1b[33m Exit was selected along specific repos, ignoring Exit`);

          reposSelectedByName.splice(exitSelected, 1);
        }

        allReposFiltered = findRepoDetailsByName(repoDetails, reposSelectedByName);

        if (allReposFiltered.length !== reposSelectedByName.length) {
          console.log(`Some repo URL is not found, found items include: [${allReposFiltered}] and repoNames selected were [${reposSelectedByName}]`)
          return;
        }
      }


      if (
        answers.option == "1: Privately check if student repos exist. (No Slack message reminder).") {
        checkReposContinuously(allReposFiltered, 0, false);

        // If Option 2 is selected do an alerting check.
      } else if (answers.option == "2: Check if student repos exist. (With Slack message reminder).") {
        checkReposContinuously(allReposFiltered, 0, true);

        // If option 3 is selected then clone the assignment then push.
      } else if (answers.option == "3: Push assignment repo to students.") {
        setupRepos(allReposFiltered);

        // If option 4 is selected then exit the app.
      } else {
        return;
      }
    });
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

// When the app runs simply prompt the user.
promptUser();