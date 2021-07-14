// Import Student List
let { studentList } = require("./studentList");

let { repoDetails } = require("./repos.js");

// Import inquirer to make shell interactive
const inquirer = require("inquirer");

// Import env file and all variables
const dotenv = require('dotenv')
dotenv.config();

//const assignments = JSON.parse(dotenv.parse(Buffer.from(process.env.ASSIGNMENTS), opt)["REPOS"]);

repoDetails = repoDetails.filter(repoDetail => !repoDetail.skip);

studentList = studentList.filter(student => !student.skip);

studentList.forEach(student => {
  student.name = student.name ? student.name : student.github
});

const { filterArrayBySelectedNames, setupRepos, checkReposContinuously } = require("./reposProcessor");

const processByOption = (option, allReposFiltered, allStudentsFiltered) => {
  if (
    option == "1: Privately check if student repos exist. (No Slack message reminder).") {
    checkReposContinuously(allStudentsFiltered, allReposFiltered, 0, false);

    // If Option 2 is selected do an alerting check.
  } else if (option == "2: Check if student repos exist. (With Slack message reminder).") {
    checkReposContinuously(allStudentsFiltered, allReposFiltered, 0, true);

    // If option 3 is selected then clone the assignment then push.
  } else if (option == "3: Push assignment repo to students.") {
    setupRepos(allStudentsFiltered, allReposFiltered);

    // If option 4 is selected then exit the app.
  }
  return;
}

const findFilteredItemsBySelectedNames = (allItem, selectedNames, type) => {
  // If option 1 is selected so a silent check.
  if (selectedNames == "exit") {
    return false;

  } else if (!selectedNames.length) {
    console.log(`\x1b[33m Nothing was selected`);
    return false;

  } else if (selectedNames.indexOf("all") > -1) {
    if (selectedNames.length > 1) {
      console.log(`\x1b[33m All Repos selected, will ignore other options`);
    }

    return allItem;
  } else {// filter out selected repos
    let exitSelected = selectedNames.indexOf("exit");
    if (exitSelected > -1 && selectedNames.length > 1) {//dont really need to check size here again
      console.log(`\x1b[33m Exit was selected along specific repos, ignoring Exit`);

      selectedNames.splice(exitSelected, 1);
    }

    allItem = filterArrayBySelectedNames(allItem, selectedNames);

    if (allItem.length !== selectedNames.length) {
      console.log(`Some ${type} are not found, found ${type} include: [${allItem}] and ${type} Names selected were [${selectedNames}]`)
      return false;
    }

    return allItem;
  }
}

const handlePromptAnswer = (answers) => {

  let reposSelectedByName = answers.repoOptions;
  let studentsSelectedByName = answers.studentOptions;

  let allReposFiltered = repoDetails;
  let allStudentsFiltered = studentList;

  console.log(` Repos selected: ${answers.repoOptions}\n`);
  console.log(` Students selected: ${answers.studentOptions}\n`);

  allReposFiltered = findFilteredItemsBySelectedNames(allReposFiltered, reposSelectedByName, 'repos');

  allStudentsFiltered = findFilteredItemsBySelectedNames(allStudentsFiltered, studentsSelectedByName, 'students');

  if (!allReposFiltered || !allStudentsFiltered) {
    console.log(`\x1b[33m Exiting`);
    return;
  }

  //console.log(`Final selected items: \n Repos: ${allReposFiltered}\n  Students: ${allStudentsFiltered}`);

  processByOption(answers.option, allReposFiltered, allStudentsFiltered);
}

const promptsTypes = [
  {
    name: "repoOptions",
    type: "checkbox",
    message: "Please select repos you want to check or push",
    choices: ["exit", "all", new inquirer.Separator()].concat(repoDetails),
    default: ["all"]
  },
  {
    name: "studentOptions",
    type: "checkbox",
    message: "Please select people you want to check or push to",
    choices: ["exit", "all", new inquirer.Separator()].concat(studentList),
    default: ["all"]
  },
  {
    name: "option",
    type: "list",
    message: "Please select your operation.",
    when: (answers) => {
      if (answers.studentOptions == "none" || !answers.studentOptions.length) {
        return false;
      } else if (answers.studentOptions == "none" || !answers.studentOptions.length) {
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