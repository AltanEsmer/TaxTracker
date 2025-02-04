document.addEventListener('DOMContentLoaded', () => {
  // Initialize Clerk
  const clerk = window.Clerk;

  if (!clerk) {
    console.error('Clerk is not loaded.');
      return;
  }

  clerk.load().then(() => {
    console.log('Clerk loaded successfully!');

    // Check if the user is authenticated
    if (clerk.user) {
      console.log('User is authenticated:', clerk.user);
      document.getElementById('sign-out-button').style.display = 'block';
    } else {
      console.log('User is not authenticated.');
    }
  }).catch(err => {
    console.error('Error loading Clerk:', err);
  });

  // Handle "Start Quizzing!" button click
  document.getElementById('cta-button').addEventListener('click', () => {
    if (clerk.user) {
      // User is authenticated, redirect to the quiz page
      window.location.href = '/quiz.html';
    } else {
      // User is not authenticated, redirect to Clerk's sign-up page
      clerk.openSignUp();
    }
  });

  // Handle sign-out button click
  document.getElementById('sign-out-button').addEventListener('click', () => {
    clerk.signOut().then(() => {
      console.log('User signed out.');
      window.location.reload();
    });
  });
});
