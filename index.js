// Import Student List
const { studentList } = require("./studentList");

// Import inquirer to make shell interactive
const inquirer = require("inquirer");

// Import env file and all variables
require("dotenv").config();
const assignmentUrl = process.env.ASSIGNMENT;
const repoName = process.env.REPONAME;
const token = process.env.TOKEN;
const githubUser = process.env.USERNAME;
const slackToken = process.env.SLACKTOKEN;

// Import Axios for HTTP requests
const axios = require("axios");

// Import shelljs to run bash (git) commands
const shell = require("shelljs");

// Import Slack API to send messages to students
const { WebClient } = require("@slack/web-api");
const slack = new WebClient(slackToken);

const checkReposSilent = () => {
  // create for loop to check all student repos and see if they exist
  studentList.forEach((student) => {
    // Do an HTTP get on each students supposed repo
    axios.get(`https://github.com/${student.github}/${repoName}`).then(
      (response) => {
        // Do nothing if you get an HTTP 200
      },
      (error) => {
        console.log(`Student ${student.github} has not made the repo yet.`);
      }
    );
  });
};

const checkReposAlert = () => {
  // create for loop to check all student repos and see if they exist
  studentList.forEach((student) => {
    // Do an HTTP get on each students supposed repo
    axios.get(`https://github.com/${student.github}/${repoName}`).then(
      (response) => {
        // Do nothing if you get an HTTP 200
      },
      (error) => {
        sendMessage(student.slack);
        console.log(
          `Student ${student.github} has not made the repo yet. Alert sent.`
        );
      }
    );
  });
};

// Function to clone assignment locally
const cloneAssignment = () => {
  // Setup github authentication so you have access to stack education
  shell.exec(`git config --global user.name "${githubUser}"`);
  shell.exec(`git config --global user.password "${token}"`);

  // First remove the repo folder and remake it empty
  shell.exec("rm -rf repo");
  shell.exec("mkdir repo");

  // Now clone the repo into that folder
  shell.cd("repo");
  shell.exec(`git clone ${assignmentUrl}`);

  // Change branch to main as this is new Github default
  shell.cd(`${repoName}`);
  shell.exec("git checkout -b main");
};

const pushToStudents = () => {
  // Create a forloop to go through each student
  studentList.forEach((student) => {
    // First create a URL using the student's username and the repo name
    const studentUrl = `https://github.com/${student.github}/${repoName}.git`;

    // Force a push of the assignment main repo
    shell.exec(`git push ${studentUrl} --force`);
  });
};

// Function that controls interactivity
const promptUser = () => {
  // Prompt the user to see what kind of app needs to run
  inquirer
    .prompt([
      {
        name: "option",
        type: "list",
        message: "Please select your operation.",
        choices: [
          "1: Privately check if student repos exist. (No Slack message reminder).",
          "2: Check if student repos exist. (With Slack message reminder).",
          "3: Push assignment repo to students.",
          "4: Exit application.",
        ],
      },
    ])
    // Then either check the repos or clone/push the assignment
    .then((answer) => {
      // If option 1 is selected so a silent check.
      if (
        answer.option ==
        "1: Privately check if student repos exist. (No Slack message reminder)."
      ) {
        checkReposSilent();
        // If Option 2 is selected do an alerting check.
      } else if (
        answer.option ==
        "2: Check if student repos exist. (With Slack message reminder)."
      ) {
        checkReposAlert();
        // If option 3 is selected then clone the assignment then push.
      } else if (answer.option == "3: Push assignment repo to students.") {
        cloneAssignment();
        pushToStudents();
        // If option 4 is selected then exit the app.
      } else {
        return;
      }
    });
};

const sendMessage = (slackId) => {
  // Connect to slack and post the reminder message using the slackId provided.
  (async () => {
    const result = await slack.chat.postMessage({
      channel: slackId,
      text: `Your repo was not found. Please create the following repo on Github. If you have created the repo please check the spelling or make the repo public. \n \n *Repo Name:* \n \`${repoName}\``,
    });
  })();
};

// When the app runs simply prompt the user.
promptUser();
