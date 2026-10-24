const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
navLinks?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  navLinks.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const form = document.getElementById('contactForm');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const note = document.getElementById('formNote');
  const submit = form.querySelector('button[type="submit"]');
  const payload = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    service: form.elements.project.value,
    message: form.elements.message.value.trim()
  };
  note.textContent = 'Sending your enquiry…';
  submit.disabled = true;
  try {
    const response = await fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to submit your enquiry.');
    note.textContent = 'Thank you! Your enquiry has been submitted successfully.';
    form.reset();
  } catch (error) {
    note.textContent = error.message || 'Could not connect to the server. Please try again.';
  } finally {
    submit.disabled = false;
  }
});


const internshipForm = document.getElementById('internshipForm');
internshipForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const note = document.getElementById('internNote');
  const submit = internshipForm.querySelector('button[type="submit"]');
  const payload = {
    name: internshipForm.elements.name.value.trim(),
    email: internshipForm.elements.email.value.trim(),
    track: internshipForm.elements.track.value,
    skills: internshipForm.elements.skills.value.trim()
  };
  note.textContent = 'Submitting application…';
  submit.disabled = true;
  try {
    const response = await fetch('/api/internships', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to submit application.');
    note.textContent = 'Application submitted. Thank you for your interest!';
    internshipForm.reset();
  } catch (error) {
    note.textContent = error.message || 'Could not connect to the server. Please try again.';
  } finally {
    submit.disabled = false;
  }
});
