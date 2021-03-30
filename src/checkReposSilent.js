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