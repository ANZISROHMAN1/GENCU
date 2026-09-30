// Mocking simple fetch to test script URL response
fetch("https://script.google.com/macros/s/AKfycbx1UEN5rD39Hw5W4xNYTJaBZCafdP-bmlJgNHqFkfpWPF7_wYotc3-MFqyeAkdCjuLI/exec")
  .then(res => res.json())
  .then(data => {
    console.log("Number of rows:", data.length);
    console.log("Row 0 (Headers):", data[0].slice(0, 5));
    console.log("Row 1 (First data):", data[1].slice(0, 5));
  })
  .catch(err => console.error(err));
