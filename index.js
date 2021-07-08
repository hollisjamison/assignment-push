// Import Student List
const { studentList } = require("./studentList");

let { repoDetails } = require("./repos.js");

// Import inquirer to make shell interactive
const inquirer = require("inquirer");

// Import env file and all variables
const dotenv = require('dotenv')
dotenv.config();

//const assignments = JSON.parse(dotenv.parse(Buffer.from(process.env.ASSIGNMENTS), opt)["REPOS"]);

repoDetails = repoDetails.filter(repoDetail => !repoDetail.skip);

const {findRepoDetailsByName, setupRepos, checkReposContinuously} = require("./reposProcessor");

const processByOption = (option, allReposFiltered) => {
  if (
    option == "1: Privately check if student repos exist. (No Slack message reminder).") {
    checkReposContinuously(studentList, allReposFiltered, 0, false);

    // If Option 2 is selected do an alerting check.
  } else if (option == "2: Check if student repos exist. (With Slack message reminder).") {
    checkReposContinuously(studentList, allReposFiltered, 0, true);

    // If option 3 is selected then clone the assignment then push.
  } else if (option == "3: Push assignment repo to students.") {
    setupRepos(studentList, allReposFiltered);

    // If option 4 is selected then exit the app.
  }
  return;
}

const handlePromptAnswer = (answers) => {

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

  processByOption(answers.option, allReposFiltered);
}

const promptsTypes = [
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
  }]

// Function that controls interactivity
const promptUser = () => {
  // Prompt the user to see what kind of app needs to run
  inquirer
    .prompt(promptsTypes)
    // Then either check the repos or clone/push the assignment
    .then(handlePromptAnswer);
};

// When the app runs simply prompt the user.
promptUser();