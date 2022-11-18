// Exceptions to the stress rules: one syllable words that have no stresses
const WORDS_TO_SKIP = new Set(["ji", "or", "nor", "kam", "mas", "kwas",
    "ki", "hu", "su", "el", "na", "le", "xa", "kom", "di", "ci", "fe",
    "in", "ex", "per", "bax", "of", "cel", "hoy", "pas", "tras", "cis",
    "wey", "fol", "de", "tas", "tem", "pro", "fal", "har", "ton", "yon",
    "por", "dur", "ku", "e", "em", ""]);

// Globasa latin script to IPA replacement mapping
const IPA_REPLACEMENTS = [
    { letter: 'c', replacement: 't͡ʃ' },
    { letter: 'j', replacement: 'd͡ʒ' },
    { letter: 'r', replacement: 'ɾ' },
    { letter: 'x', replacement: 'ʃ' },
    { letter: 'y', replacement: 'j' },
    { letter: 'h', replacement: 'x' }
]

const STRESS_MARKER = 'ˈ';
const NO_SHIFT_CHARS = ['a', 'e', 'i', 'o', 'u', '-']; // Vowels don't shift, but also don't go past a hyphen
const ONSET_CONSONANTS = ['b', 'd', 'f', 'g', 'k', 'p', 't', 'v'];
const CODA_CONSONANTS = ['c', 'x', 'j', 'l', 'm', 'n', 'r', 's', 'w', 'x', 'y', 'z']
const SPECIAL_SHIFT_LETTERS = ['y', 'w', 'r', 'l']; // TODO remove
const ALL_QUOTES_REGEX = /['"“”‘’]/g;
const SENTENCE_REGEX = /([;:.?!])\s*(?=[a-zA-Zˈt͡ʃd͡ʒɾʃ])/g;
const PUNCTUATION_REGEX = /[;:.?!]/;
const FINAL_VOWEL_REGEX = /[aeiou](?!.*[aeiou])/i;
const MATCH_WORDS_REGEX = /\b\w*[-']*\w*\b/g;
// Word matching regex alterantives from
// https://stackoverflow.com/questions/31910955/regex-to-match-words-with-hyphens-and-or-apostrophes



/**
* Converts text in globasaInput (Globasa latin script) to IPA
*/
function convertAction() {
    text = convertToIpa(document.getElementById("globasaInput").value);
    document.getElementById("ipaOutput").innerHTML = text;
}



/**
 * Converts text in globasaInput (Globasa latin script) to IPA for
 * text to speech applications. Also creates link to reader.
 * 
 * Encapsulate text in prosody tags, and phrases in phoneme phrase
 * tags + break tag. Delete quotes, replace commas with semicolons.
*/
function convertSsmlAction() {
    text = convertToIpa(document.getElementById("globasaInput").value);
    text = ipaToSsml(text);

    document.getElementById("ipaOutput").innerHTML = text;
}



/**
 * Converts text in globasaInput (Globasa latin script) to IPA.
*/
function convertToIpa(text) {
    return replaceLettersWithIPA(addStressesToText(text.toLowerCase()));
}



/**
 * Converts IPA text to SSML.
 * 
 * Encapsulate text in prosody tags, and phrases in phoneme phrase
 * tags + break tag. Delete quotes, replace commas with semicolons.
 * 
 * <phoneme alphabet=\"ipa\" ph=\"PHRASE\">
 * </phoneme>;<break time=\"0.25s\"/>"
 * 
 * A phrase ends with a semicolon, colon, period, question mark or
 * exclamation mark.
 */
function ipaToSsml(text) {
    text = text.replaceAll(',', ";");
    text = text.replace(ALL_QUOTES_REGEX, "");

    // Replace ;:.?! punctuation with the punctuation and a pipe. Split on pipe.
    // https://stackoverflow.com/questions/18914629/split-string-into-sentences-in-javascript 
    // This seems to skip white space between sentences.
    let sentences = text.replace(SENTENCE_REGEX, "$1|").split("|");

    let result = "<prosody rate=\"slow\">"
    sentences.forEach(sentence => {
        
        let punctuation = sentence.slice(-1).match(PUNCTUATION_REGEX);
        if (punctuation !== null) {
            sentence = sentence.slice(0, -1);
            punctuation = punctuation[0];
        }
        else {
            punctuation = "";
        }
        result += "<phoneme alphabet=\"ipa\" ph=\"" +
                    sentence + "\"></phoneme>" + punctuation;
        if (sentence.slice(-1) !== ";") {
            result += "<break time=\"0.25s\"/>";
        }
    });
    result += "</prosody>";

    return result;
}



/**
 * Simple replacement of letters to IPA
 */
function replaceLettersWithIPA(text) {
    for (let rule of IPA_REPLACEMENTS) {
        text = text.replaceAll(rule.letter, rule.replacement);
    }

    return text;
}



/**
 * Takes text that may have paragraph new lines and sentence punctuation,
 * and calls stressVowels() for each word.
 */
function addStressesToText(input) {

    let output = "";
    let previousEnd = 0;

    const words = input.matchAll(MATCH_WORDS_REGEX);

    for (const word of words) {

        // Non-words are empty strings
        if (word[0].length == 0) {
            continue;
        }

        // Get any skipped characters, which would be between words
        output += input.slice(previousEnd, word.index);
        // Add stress markers to current work
        output += addStressToWord(word[0], true);
        previousEnd = word.index + word[0].length
    }

    output += input.slice(previousEnd);

    return output;
}



/*
  Adds stress markers according to Globasa grammer:
  
  
  # Skip Rule
  
  If it's on the one-syllable excluded list, do not stress any vowels.

  ---

  # Single Vowel Rule

  If there is only one vowel, the stress goes on the first letter.

  ---

  # Vowel Select Rule (Default)
  
  If the word ends with a vowel, select the second last vowel.
  If it does not end with a vowel, select the last vowel.
  
  ---

  # Select Shift Rules
  
  Usually, shift 1 (when the adjacent letter is a consonant).
  Specifically:

  If the selected vowel is the first letter, or the adjacent letter
  is a vowel or dash (NO_SHIFT_CHARS), do not shift the stress from
  the selected vowel.

  If the adjacent letter before the selected vowel is a consonant,
  shift the stress left to the consonant. It may need an extra shift
  if fits the exceptions below, giving it a shift of 2.

  YW Extra Shift Exception:
  If the adjacent letter is a 'y' or 'w' (name for these?),
  check the 2nd adjacent letter. Shift by 2 unless the 2nd adjacent
  letter is also a 'y' or 'w', or is a vowel or dash (NO_SHIFT_CHARS),
  or past the start of the word, in which case keep the shift at 1.

  (The YW exception could be written as shift by 2 unless 2nd adjacent
  is any consonant other than Y or W.)

  RL Exception:
  If the adjacent letter is a `r` or `l`, check the 2nd adjacent
  letter. If it's a vowel or dash (NO_SHIFT_CHARS) or coda consonant,
  or would be past the start of the word keep shift at 1. If it's a
  onset consonant, shift 2.
  
 

  Algorithm
  ---------
  
  Skip: If the word is on the one syllable excluded list, do nothing.

  Single Vowel: If there is only a single vowel, stress the first
  letter.
  
  Vowel Select: Otherwise, take the word and remove the last letter.
  Of the remainder, select the last vowel in the word for stress.

  Stress Shift:

  Assume shift by 1.

  if the selected vowel is the first letter (semivowels)
  or the adjacent letter is a NO_SHIFT_CHARS (vowels, hyphen)
  then shift = 0

  if first adjacent is `y` or `w` (semivowels)
  and second adjacent is *not* `y` or `w` or NO_SHIFT_CHARS (vowels, hyphen)
  then shift 2.

  if first adjacent is `r` or `l` (approximants)
  and second adjacent is an onset consonant
  then shift 2
  


  Notes:

  - Adjacent means to the left of the stress vowel.

  - 2nd adjacent means to the left of the adjacent letter.
    (Second order adjacent)

  - NO_SHIFT_CHARS means characters that are a vowels or hyphen

  - RL_ONSET_CONSONANTS: (b, d, f, g, k, p, t, v)

  - RL_CODA_CONSONANTS (c, x, j, l, m, n, r, s, w, x, y, z) 

  - These are before the IPA letters substitution, which doesn't make sense
    linguistically, but it means the code doesn't have to worry about
    multicharacter IPA sounds.

*/
function addStressToWord(word = "") {

    // Skip Rule
    if (WORDS_TO_SKIP.has(word)) {
        return word;
    }
    else if (word == null) {
        return "";
    }

    // Single vowel rule (or no vowels)
    var vowels = word.match(/[aeiou]/gi);
    if (vowels === null) {
        return word;
    }
    else if (vowels.length == 1) {
        return STRESS_MARKER + word;
    }

    // Vowel Select Rule
    const match = word.slice(0, -1).match(FINAL_VOWEL_REGEX);
    const pos = word.slice(0, -1).lastIndexOf(match);
    const adj1 = word.charAt(pos - 1);
    const adj2 = word.charAt(pos - 2);

    // Shift Rules
    let shift = -1;

    if (pos == 0 || NO_SHIFT_CHARS.includes(adj1)) {
        shift = 0;
    }
    else if (
        (adj1 == 'y' || adj1 == 'w') &&
        (adj2 != 'y' && adj2 != 'w' && !NO_SHIFT_CHARS.includes(adj2))
    ) {
        shift = -2;
    }
    else if ((adj1 == 'r' || adj1 == 'l') &&
        ONSET_CONSONANTS.includes(adj2)
    ) {
        shift = -2;
    }

    return word.slice(0, pos + shift) + STRESS_MARKER + word.slice(pos + shift);
}