# Assignment Push
A simple NodeJS application that takes a repo and distributes it to a student list on their repos. There are certain requirements before this script will work:

1. Students must use the exact same repo-name as the source repo.
2. Students must add your user as contribuitor on your repo.
3. You must be a contribuitor on the assignment repo assuming it is private.

## Installation
1. Clone the repo
> git clone https://github.com/hollisjamison/assignment-push.git
2. Move into the repo folder
> cd assignment-push
3. Install dependecies with npm
> npm install

## Usage
1. Create a .env file using the provided DOTENV-example.env
```
    ASSIGNMENT=https://github.com/hollisjamison/repo-name.git
    REPONAME=repo-name
    USERNAME=hollisjamison@gmail.com
    TOKEN=GITHUB-ACCESS-TOKEN
    SLACKTOKEN=SLACK-OAUTH-TOKEN
```
2. Customize the .env file by adding your information. Make sure to update the assignment and repo name on each run.
3. Edit the studentList.js with an array of the list of your student's GitHub usernames.
4. Run the application
>npm start
