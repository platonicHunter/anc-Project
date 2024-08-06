function truncateDescription(description, wordLimit) {
    let words = description.split(' ');
    if (words.length > wordLimit) {
      words = words.slice(0, wordLimit);
      return words.join(' ') + '...'; // Append ellipsis to indicate truncation
    }
    return description;
  }