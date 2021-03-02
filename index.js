// Import Student List
const { studentList } = require("./studentList");

// Import env file and all variables
require("dotenv").config();
const assignmentUrl = process.env.ASSIGNMENT;
const repoName = process.env.REPONAME;
const token = process.env.TOKEN;
const githubUser = process.env.USERNAME;

// Import shelljs to run bash (git) commands
const shell = require("shelljs");

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
  studentList.forEach(student => {
    // First create a URL using the student's username and the repo name
    const studentUrl = `https://github.com/${student}/${repoName}.git`;

    // Force a push of the assignment main repo
    shell.exec(`git push ${studentUrl} --force`);
  });
}

// Now call the functions in order
cloneAssignment();
pushToStudents();
