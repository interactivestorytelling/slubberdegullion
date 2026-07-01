"use strict";

// --- Constants ---
const darkGray = "#444444";
const darkGreen = "#84B858";
const lightGreen = "#E4F7DD";
const lightYellow = "#FEFDD0";
const darkYellow = "#FFC081";
const highlightBlue = "#2B63D9";
const myPink = "#FBE8EE";
const cHiddenVariables = 3; // Number of global variables/sliders per choice

// --- Global Variables ---
let incidents = []; // Master list of incidents, loaded from JSON
let sliderLabels = ["Cynicism", "Intelligence", "Curiosity"]; // Default labels, can be loaded/saved later if needed
let quantifierLabels = ["All", "Big", "Some", "Small", "None"];
let sliders = new Array(cHiddenVariables * 3); // References to slider elements

let incidentselector; // The select box in the left column
let introElement;      // The HTML element for the intro text
let hiddenLabelElements = []; // References to slider label input elements (populated in initialize)

let iIncident = 0;      // Index of the currently displayed Incident
let iChoice = 0;         // Index of the currently selected choice (0, 1, or 2)
let iChoiceIsValid = false; // Flag if a choice is currently selected

// --- Classes ---
class Choice {
    choiceText = "Unused Choice"; // Text of the choice
    delta = [50, 50, 50];         // The three values (0-100) for the sliders
    consequence = "";             // The title of the Incident that follows this choice

    constructor() {
        // Ensure delta always has the correct number of elements
        this.delta = Array(cHiddenVariables).fill(50);
    }
}

class Incident {
    title = "Untitled Incident"; // Title of the Incident
    introText = "Introductory text"; // The main text
    choices = [];                // Array to hold Choice objects
    palm = false;                // Boolean flag (purpose specific to your design)

    constructor(title) {
        this.title = title || "Untitled Incident";
        // Initialize with the correct number of default Choice objects
        for (let i = 0; i < 3; i++) {
            this.choices.push(new Choice());
        }
    }
}

//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// --- Initialization ---
async function initialize() {
    // --- Load incident Data ---
    try {
        const jsonFilename = "MyStoryworld.json"; // Or determine dynamically if needed
        console.log(`Fetching ${jsonFilename}...`);
        const jsonVersion = await asyncFileLoad(jsonFilename);

        if (jsonVersion) {
            // Assuming the JSON file is an array of Incident objects
            const parsedData = JSON.parse(jsonVersion);
            if (Array.isArray(parsedData)) {
                 // Create Incident instances from the plain JSON objects
                 // This ensures methods are available if added to the class later
                 incidents = parsedData.map((encData, index) => {
                    const incident = new Incident(encData.title);
                    incident.introText = encData.introText || "";
                    incident.palm = encData.palm || false;
                    if (Array.isArray(encData.choices)) {
                        incident.choices = encData.choices.map(chData => {
                            const choice = new Choice();
                            choice.choiceText = chData.choiceText || "";
                            choice.consequence = chData.consequence || "";
                            // Ensure delta array has correct length, padding if necessary
                            choice.delta = Array.isArray(chData.delta)
                                ? chData.delta.slice(0, cHiddenVariables).concat(Array(Math.max(0, cHiddenVariables - chData.delta.length)).fill(50))
                                : Array(cHiddenVariables).fill(50);
                            return choice;
                        });
                        // Ensure exactly 3 choices, padding if necessary
                        while (incident.choices.length < 3) {
                            incident.choices.push(new Choice());
                        }
                        incident.choices = incident.choices.slice(0, 3);
                    } else {
                         // Ensure 3 default choices if JSON was missing them
                         incident.choices = [];
                         for (let i = 0; i < 3; i++) incident.choices.push(new Choice());
                    }
                    return incident;
                });
            } else {
                console.error("Parsed JSON is not an array:", parsedData);
                alert("Error: ExampleStoryworld.json does not contain a valid Incident array.");
                return; // Stop initialization
            }
        } else {
            console.error(`Failed to load ${jsonFilename}. Using empty Incident list.`);
            alert(`Error: Could not load ${jsonFilename}. Check file existence and network connection.`);
            incidents = []; // Start with empty if load fails
        }
    } catch (error) {
        console.error("Error during initialization loading/parsing JSON:", error);
        alert(`Error initializing: ${error.message}. Check console for details.`);
        incidents = []; // Start empty on error
        // return; // Stop initialization
    }

    // --- Get DOM Element References ---
    incidentselector = document.getElementById("incidentList");
    introElement = document.getElementById("introText");

    if (!incidentselector || !introElement) {
        console.error("Essential DOM elements (IncidentList or introText) not found!");
        alert("Error: Could not find essential page elements. The application cannot start.");
        return;
    }

    // Get references to slider elements/labels
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < cHiddenVariables; j++) {
            const sliderIndex = i * cHiddenVariables + j;
            sliders[sliderIndex] = document.getElementById(`slider${sliderIndex}`);
            hiddenLabelElements[sliderIndex] = document.getElementById(`sliderLabel${sliderIndex}`);
            // Add other elements if needed (e.g., valueLabel)
        }
    }

    // --- Populate Incident List Selector ---
    incidentselector.innerHTML = ""; // Clear existing options
    incidentselector.multiple = false;
    incidents.forEach((incident, index) => {
    		addNewOptToincidentselect(index, incident);
    });

    // --- Populate Consequence Dropdowns ---
    // Assuming consequence dropdowns are named "conseq1", "conseq2", "conseq3"
    for (let j = 0; j < 3; j++) {
        const conseqSelector = document.getElementById(`conseq${j + 1}`);
        if (conseqSelector) {
            conseqSelector.innerHTML = ""; // Clear existing options
            incidents.forEach((incident, index) => {
                const opt = document.createElement("option");
                opt.value = incident.title; // Store title in value
                opt.text = incident.title;
                conseqSelector.add(opt);
            });
            // Add listener to update the consequence in the data model when changed
            conseqSelector.addEventListener('change', function() {
                if (iChoiceIsValid) {
                    const choiceIndex = parseInt(this.id.substring(6)) - 1; // Get index (0, 1, or 2) from ID "conseqX"
                    if (choiceIndex === iChoice && incidents[iIncident]) {
                         incidents[iIncident].choices[choiceIndex].consequence = this.value;
                    }
                }
            });
        } else {
            console.warn(`Consequence selector conseq${j + 1} not found.`);
        }
    }

    // --- Setup Initial State ---
    iIncident = 0; // Start with the first Incident
    iChoice = 0;    // Select the first choice by default initially
    iChoiceIsValid = false; // No choice is *actively* selected until clicked

    if (incidents.length > 0) {
        displayIncident(); // Display the first Incident
        handleChoiceClick(0); // Simulate click on the first choice to set initial state
    } else {
        console.warn("No incidents loaded, editor is empty.");
        // Optionally clear or disable editing fields
    }

    // --- Setup Choice Click Handlers ---
    // Use a loop for cleaner setup
    for (let i = 0; i < 3; i++) {
        const choiceButton = document.getElementById(`choice${i}`);
        if (choiceButton) {
            choiceButton.addEventListener('click', function() {
                handleChoiceClick(i); // Pass the index directly
            });
        } else {
            console.warn(`Choice button choice${i} not found.`);
        }
    }

     // --- Setup Slider Label Handlers ---
     // Assuming labels are inputs named "sliderLabel0", "sliderLabel1", ... "sliderLabel8"
     for (let i = 0; i < cHiddenVariables * 3; i++) {
        const labelInput = document.getElementById(`sliderLabel${i}`);
        if (labelInput) {
            labelInput.addEventListener('change', function() {
                handleNewHiddenVariableName(i); // Pass the slider index
            });
        }
     }

    // --- Setup Button Handlers ---
    document.getElementById('renameButton')?.addEventListener('click', handleRenameButton);
    document.getElementById('saveButton')?.addEventListener('click', handleSaveClick);
//    document.getElementById('fileInput')?.addEventListener('change', readJsonFile); // Assuming file input with id="fileInput"
    
    // -- I'm sick and tired of writing clever code
    document.getElementById('upDownButton11')?.addEventListener('click', handleUpDownButton11);
    document.getElementById('upDownButton12')?.addEventListener('click', handleUpDownButton12);
    document.getElementById('upDownButton13')?.addEventListener('click', handleUpDownButton13);
    document.getElementById('upDownButton21')?.addEventListener('click', handleUpDownButton21);
    document.getElementById('upDownButton22')?.addEventListener('click', handleUpDownButton22);
    document.getElementById('upDownButton23')?.addEventListener('click', handleUpDownButton23);
    document.getElementById('upDownButton31')?.addEventListener('click', handleUpDownButton31);
    document.getElementById('upDownButton32')?.addEventListener('click', handleUpDownButton32);
    document.getElementById('upDownButton33')?.addEventListener('click', handleUpDownButton33);
    
    document.getElementById('quantifier11')?.addEventListener('click', handleQuantifier11);
    document.getElementById('quantifier12')?.addEventListener('click', handleQuantifier12);
    document.getElementById('quantifier13')?.addEventListener('click', handleQuantifier13);
    document.getElementById('quantifier21')?.addEventListener('click', handleQuantifier21);
    document.getElementById('quantifier22')?.addEventListener('click', handleQuantifier22);
    document.getElementById('quantifier23')?.addEventListener('click', handleQuantifier23);
    document.getElementById('quantifier31')?.addEventListener('click', handleQuantifier31);
    document.getElementById('quantifier32')?.addEventListener('click', handleQuantifier32);
    document.getElementById('quantifier33')?.addEventListener('click', handleQuantifier33);
    
		document.getElementById("globalLabel1A").innerHTML = sliderLabels[0];  
		document.getElementById("globalLabel1B").innerHTML = sliderLabels[1];  
		document.getElementById("globalLabel1C").innerHTML = sliderLabels[2];  
		document.getElementById("globalLabel2A").innerHTML = sliderLabels[0];  
		document.getElementById("globalLabel2B").innerHTML = sliderLabels[1];  
		document.getElementById("globalLabel2C").innerHTML = sliderLabels[2];  
		document.getElementById("globalLabel3A").innerHTML = sliderLabels[0];  
		document.getElementById("globalLabel3B").innerHTML = sliderLabels[1];  
		document.getElementById("globalLabel3C").innerHTML = sliderLabels[2];  
}

// --- Core Display Logic ---
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function displayIncident() {
    if (iIncident < 0 || iIncident >= incidents.length) {
        console.error(`Invalid Incident index: ${iIncident}`);
        // Optionally clear the display or show an error message
        introElement.value = "Error: Incident not found.";
        // Clear other fields...
        return;
    }

    const currentIncident = incidents[iIncident];

    // --- Highlight selected Incident in the list ---
    if (incidentselector.options.length > iIncident) {
         incidentselector.selectedIndex = iIncident; // Set dropdown selection
         const currentOption = incidentselector.options[iIncident];
         if (currentOption) {
            currentOption.style.backgroundColor = highlightBlue;
            currentOption.style.color = "WHITE";
         }
    }


    // --- Display Intro Text ---
    // Decode %% into paragraphs
    const textArray = currentIncident.introText ? currentIncident.introText.split('%%') : [""];
    let introContent = "";
    textArray.forEach(paragraph => {
        introContent += decodeString(paragraph.trim()) + "\n\n"; // Use \n for textarea display
    });
    introElement.value = introContent.trim();

    // --- Display Choices ---
    for (let i = 0; i < 3; i++) {
        const choiceData = currentIncident.choices[i] || new Choice(); // Handle potential missing choices gracefully

        // Display Choice Text
        const choiceTextArea = document.getElementById(`choice${i}`);
        if (choiceTextArea) {
            choiceTextArea.value = decodeString(choiceData.choiceText);
            choiceTextArea.style.color = "#666666"; // Default non-selected color
            choiceTextArea.style.backgroundColor = darkGreen; // Default non-selected background
        } else {
            console.warn(`Choice textarea choice${i} not found.`);
        }

        // Set Consequence Dropdown
        const conseqSelector = document.getElementById(`conseq${i + 1}`);
        if (conseqSelector) {
            conseqSelector.value = choiceData.consequence; // Set dropdown value to the title
            // Check if the value actually exists in the options, select default if not
            if (conseqSelector.selectedIndex === -1 && conseqSelector.options.length > 0) {
                 console.warn(`Consequence "${choiceData.consequence}" not found in dropdown for choice ${i}. Setting to default.`);
                 conseqSelector.selectedIndex = 0; // Or some other default like the current Incident?
                 // Update the data model if we had to change the selection
                 // currentIncident.choices[i].consequence = conseqSelector.value;
            }
            conseqSelector.disabled = true; // Disable by default, enable in handleChoiceClick
        } else {
            console.warn(`Consequence selector conseq${i + 1} not found.`);
        }


        // --- Display Sliders and Labels ---
        for (let j = 0; j < cHiddenVariables; j++) {
            const sliderIndex = i * cHiddenVariables + j;
            const deltaValue = choiceData.delta[j] !== undefined ? choiceData.delta[j] : 50; // Default to 50 if missing

            // Set Slider Value
            const slider = document.getElementById(`slider${sliderIndex}`);
            if (slider) {
                slider.value = deltaValue;
                slider.disabled = true; // Disable by default, enable in handleChoiceClick

                // --- Add/Update Slider Event Listener ---
                // Simple approach: Remove old listener (if any) and add new one.
                // A more complex approach might store/reuse listeners, but this is often sufficient.
                 const listener = function() {
                    handleSliderInput(sliderIndex);
                 };
                 // Remove potential existing listener before adding - requires storing the listener reference or using anonymous functions carefully
                 // For simplicity here, we assume re-adding is okay or managed elsewhere if performance becomes an issue.
                 // A common pattern is to replace the element or use a dedicated update function.
                 // Let's try a simple re-add approach first. If sliders misbehave, this needs refinement.
                 // slider.removeEventListener('input', listener); // This won't work if listener is redefined each time
                 slider.oninput = listener; // Overwrite the oninput handler


            } else {
                console.warn(`Slider slider${sliderIndex} not found.`);
            }

            // Set Slider Value Label
            const valueLabel = document.getElementById(`valueLabel${sliderIndex}`);
            if (valueLabel) {
                const displayValue = (deltaValue - 50) / 50;
                valueLabel.innerHTML = displayValue.toFixed(2); // Format to 2 decimal places
            } else {
                console.warn(`Value label valueLabel${sliderIndex} not found.`);
            }

            // Set Slider Name Label
            const sliderNameLabel = document.getElementById(`sliderLabel${sliderIndex}`);
            if (sliderNameLabel) {
                sliderNameLabel.value = sliderLabels[j] || `Var ${j+1}`; // Use global label
                sliderNameLabel.disabled = true; // Disable by default
            } else {
                console.warn(`Slider name label sliderLabel${sliderIndex} not found.`);
            }

            // Style Slider Container (optional)
            const slideContainer = document.getElementById(`slideContainer${sliderIndex}`);
            if (slideContainer) {
                slideContainer.style.backgroundColor = ""; // Reset background
            }
        }
    }
    
    // After setting up, ensure the currently selected choice (if any) is highlighted
    if (iChoiceIsValid) {
        handleChoiceClick(iChoice);
    } else {
        // Ensure all consequence dropdowns and sliders are disabled if no choice is selected
        for (let i = 0; i < 3; i++) {
            const conseqSelector = document.getElementById(`conseq${i + 1}`);
            if (conseqSelector) conseqSelector.disabled = true;
             for (let j = 0; j < cHiddenVariables; j++) {
                 const sliderIndex = i * cHiddenVariables + j;
                 const slider = document.getElementById(`slider${sliderIndex}`);
                 if (slider) slider.disabled = true;
                 const sliderNameLabel = document.getElementById(`sliderLabel${sliderIndex}`);
                 if (sliderNameLabel) sliderNameLabel.disabled = true;
             }
        }
    }
    if (currentIncident.title == "PalmNode") {
    	showPalmCalculations();
    	document.getElementById("renameButton").disabled = true;
    }
    else {
    	hidePalmCalculations();
    	document.getElementById("renameButton").disabled = false;
    }
    
}

// --- Event Handlers ---
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleSliderInput(sliderIndex) {
     const slider = document.getElementById(`slider${sliderIndex}`);
     if (!slider) return;

     const newValue = parseInt(slider.value, 10); // Ensure value is an integer

     const currentChoiceIndex = Math.floor(sliderIndex / cHiddenVariables);
     const currentDeltaIndex = sliderIndex % cHiddenVariables;

     // Update the data model
     if (incidents[iIncident] && incidents[iIncident].choices[currentChoiceIndex]) {
         incidents[iIncident].choices[currentChoiceIndex].delta[currentDeltaIndex] = newValue;
     } else {
         console.error("Error updating delta: Incident or Choice index out of bounds");
         return; // Don't update label if data update failed
     }

     // Update the displayed value label
     const valueLabel = document.getElementById(`valueLabel${sliderIndex}`);
     if (valueLabel) {
         const displayValue = (newValue - 50) / 50;
         valueLabel.innerHTML = displayValue.toFixed(2);
     }
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleChoiceClick(choiceIndex) {
    if (iIncident < 0 || iIncident >= incidents.length) return; // No Incident selected

    iChoice = choiceIndex;
    iChoiceIsValid = true;
    console.log(`Choice ${iChoice} clicked for Incident ${iIncident}`);

    // Update styles and enabled states
    for (let i = 0; i < 3; i++) {
        const isSelected = (i === iChoice);

        // Style Choice Text Area
        const choiceTextArea = document.getElementById(`choice${i}`);
        if (choiceTextArea) {
            choiceTextArea.style.color = isSelected ? "BLACK" : "#666666";
            choiceTextArea.style.backgroundColor = isSelected ? lightGreen : darkGreen;
        }

        // Enable/Disable Consequence Dropdown
        const conseqSelector = document.getElementById(`conseq${i + 1}`);
        if (conseqSelector) {
            conseqSelector.disabled = !isSelected;
        }

        // Enable/Disable Sliders and Labels for this choice
        for (let j = 0; j < cHiddenVariables; j++) {
            const sliderIndex = i * cHiddenVariables + j;

            const slider = document.getElementById(`slider${sliderIndex}`);
            if (slider) slider.disabled = !isSelected;

            const sliderNameLabel = document.getElementById(`sliderLabel${sliderIndex}`);
            if (sliderNameLabel) sliderNameLabel.disabled = !isSelected;

            // Style Slider Container (optional)
            const slideContainer = document.getElementById(`slideContainer${sliderIndex}`);
            if (slideContainer) {
                slideContainer.style.backgroundColor = isSelected ? lightYellow : ""; // Highlight background if selected
            }
        }
    }
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleNewHiddenVariableName(sliderIndex) {
    const hiddenVarIndex = sliderIndex % cHiddenVariables; // Index (0, 1, 2) of the variable being renamed
    const labelInput = document.getElementById(`sliderLabel${sliderIndex}`);

    if (!labelInput) return;

    const newLabel = labelInput.value;
    sliderLabels[hiddenVarIndex] = newLabel; // Update the global label array

    console.log(`Updated hidden variable ${hiddenVarIndex} name to "${newLabel}"`);

    // Update all corresponding labels (0, 3, 6 or 1, 4, 7 or 2, 5, 8)
    for (let i = 0; i < 3; i++) {
        const correspondingIndex = i * cHiddenVariables + hiddenVarIndex;
        const otherLabelInput = document.getElementById(`sliderLabel${correspondingIndex}`);
        if (otherLabelInput) {
            otherLabelInput.value = newLabel;
        }
        // Also update any display-only labels if they exist (like "endHiddenX")
        const endHiddenLabel = document.getElementById(`endHidden${hiddenVarIndex + 1}`); // Assuming IDs like endHidden1, endHidden2, endHidden3
        if (endHiddenLabel) {
             endHiddenLabel.innerHTML = newLabel;
        }
    }
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleSaveClick() {
    // Ensure the currently displayed data is saved into the object model first
    saveThisIncident();

    // Prepare the data for saving. We usually want to save the plain data structure.
    // Create a deep copy to avoid modifying the live data if necessary,
    // or directly stringify the 'incidents' array.
    // We will NOT use encodeString here, as JSON handles special characters.
    // The %% encoding/decoding should happen only when displaying/saving intro text.

    try {
        // Create a version suitable for JSON (without %% encoding unless specifically desired in the file)
        const incidentsToSave = JSON.parse(JSON.stringify(incidents)); // Deep copy
        incidentsToSave.forEach(enc => {
            // Decode introText back from internal format if needed before saving
            // Or ensure saveThisIncident saves the raw text without %%
            enc.introText = decodeString(enc.introText); // Assuming saveThisIncident used encodeString
            enc.choices.forEach(ch => {
                ch.choiceText = decodeString(ch.choiceText); // Assuming saveThisIncident used encodeString
            });
        });


        // Stringify the incidents array with pretty printing (2-space indentation)
        const jsonString = JSON.stringify(incidentsToSave, null, 2);

        // Create a Blob (Binary Large Object) containing the JSON data
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a temporary anchor element to trigger the download
        const anchor = document.createElement('a');
        anchor.download = 'MyStoryworld.json'; // Filename for the download
        anchor.href = window.URL.createObjectURL(blob); // Create a URL for the Blob

        // Append to body, click, and remove (standard download trigger)
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        // Release the allocated Blob URL
        window.URL.revokeObjectURL(anchor.href);

        alert("incidents saved successfully as MyStoryworld.json");

    } catch (error) {
        console.error("Error generating or saving JSON:", error);
        alert("Error saving data: " + error.message + ". Check console for details.");
    }
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleRenameButton() {
    if (iIncident < 0 || iIncident >= incidents.length) {
         alert("No Incident selected to rename.");
         return;
    }
    const currentIncident = incidents[iIncident];
    const oldTitle = currentIncident.title;

    const newTitle = prompt("Rename the Incident:", oldTitle);

    if (newTitle !== null && newTitle.trim() !== "" && newTitle.trim() !== oldTitle) {
        const trimmedTitle = newTitle.trim();
        console.log(`Renaming Incident "${oldTitle}" to "${trimmedTitle}"`);

        // Update title in data model
        currentIncident.title = trimmedTitle;

        // Update title in Incident selector
        const option = incidentselector.options[iIncident];
        if (option) {
            option.text = trimmedTitle;
        }

        // Update title in all consequence dropdowns
        for (let j = 0; j < 3; j++) {
            const conseqSelector = document.getElementById(`conseq${j + 1}`);
            if (conseqSelector) {
                 // Update the text/value of the option corresponding to the renamed Incident
                 for(let k = 0; k < conseqSelector.options.length; k++) {
                     if (conseqSelector.options[k].value === oldTitle) {
                         conseqSelector.options[k].value = trimmedTitle;
                         conseqSelector.options[k].text = trimmedTitle;
                         break;
                     }
                 }
                 // Also update the currently selected consequence if it was the renamed one
                 if (conseqSelector.value === oldTitle) {
                     conseqSelector.value = trimmedTitle;
                 }
            }
        }

        // Update consequence references in other incidents
         incidents.forEach((enc, index) => {
             if (index !== iIncident) { // Don't check self
                 enc.choices.forEach(choice => {
                     if (choice.consequence === oldTitle) {
                         choice.consequence = trimmedTitle;
                         console.log(`Updated consequence link in "${enc.title}"`);
                     }
                 });
             }
         });

        // Refresh display (optional, title isn't directly shown in edit area)
        // displayIncident(); // Might cause loss of focus if inputs are active
        alert(`Incident renamed to "${trimmedTitle}"`);
    }
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton11() {	
	if (document.getElementById("upDownButton11").innerHTML=="+") {
		document.getElementById("upDownButton11").innerHTML = "-";		
	}
	else if (document.getElementById("upDownButton11").innerHTML == "-") {
		document.getElementById("upDownButton11").innerHTML = "+";
	}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton12() {	
	if (document.getElementById("upDownButton12").innerHTML == "+") {
		document.getElementById("upDownButton12").innerHTML = "-";
	}
	else if (document.getElementById("upDownButton12").innerHTML == "-") {
		document.getElementById("upDownButton12").innerHTML = "+";
	}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton13() {	
	if (document.getElementById("upDownButton13").innerHTML == "+") {
		document.getElementById("upDownButton13").innerHTML = "-";
	}
	else if (document.getElementById("upDownButton13").innerHTML == "-") {
		document.getElementById("upDownButton13").innerHTML = "+";
	}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton21() {	
	if (document.getElementById("upDownButton21").innerHTML == "+") {
		document.getElementById("upDownButton21").innerHTML = "-";
	}
	else if (document.getElementById("upDownButton21").innerHTML == "-") {
		document.getElementById("upDownButton21").innerHTML = "+";
	}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton22() {	
	if (document.getElementById("upDownButton22").innerHTML == "+") {
		document.getElementById("upDownButton22").innerHTML = "-";
	}
	else if (document.getElementById("upDownButton22").innerHTML == "-") {
		document.getElementById("upDownButton22").innerHTML = "+";
	}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton23() {	
	if (document.getElementById("upDownButton23").innerHTML == "+") {
		document.getElementById("upDownButton23").innerHTML = "-";
	}
	else if (document.getElementById("upDownButton23").innerHTML == "-") {
		document.getElementById("upDownButton23").innerHTML = "+";
	}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton31() {	
	if (document.getElementById("upDownButton31").innerHTML == "+") {
		document.getElementById("upDownButton31").innerHTML = "-";
	}
	else if (document.getElementById("upDownButton31").innerHTML == "-") {
		document.getElementById("upDownButton31").innerHTML = "+";
	}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton32() {	
	if (document.getElementById("upDownButton32").innerHTML == "+") {
		document.getElementById("upDownButton32").innerHTML = "-";
		if (incidents[iIncident].choices[3].delta[2] > 50)
			incidents[iIncident].choices[3].delta[2] = 100-incidents[iIncident].choices[3].delta[2];
	}
	else if (document.getElementById("upDownButton32").innerHTML == "-") {
		document.getElementById("upDownButton32").innerHTML = "+";
		if (incidents[iIncident].choices[3].delta[2] < 50)
			incidents[iIncident].choices[3].delta[2] = 100-incidents[iIncident].choices[3].delta[2];
	}
	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleUpDownButton33() {	
	if (document.getElementById("upDownButton33").innerHTML == "+") {
		document.getElementById("upDownButton33").innerHTML = "-";
	}
	else if (document.getElementById("upDownButton33").innerHTML == "-") {
		document.getElementById("upDownButton33").innerHTML = "+";
	}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier11() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier12() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier13() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier21() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier22() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier23() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier31() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier32() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function handleQuantifier33() {	
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

// --- Data Persistence ---
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
async function asyncFileLoad(filename) {
    try {
        console.log("Fetching file:", filename);
        const response = await fetch(filename, { cache: "no-store" }); // Prevent caching issues

        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
        }

        const fileContent = await response.text();
        console.log("File content loaded successfully.");
        return fileContent;
    } catch (error) {
        console.error("Error loading the file:", error);
        // Return null or throw error to indicate failure
        return null;
    }
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
	function repopulateincidentsets() {
		// Repopulate Incident list
		for (let i=0; i<incidents.length; ++i) {
			incidentselector.remove(i);
			for (let j=0; j<3; ++j) {
				const conseqSelector = document.getElementById(`conseq${j + 1}`);
				conseqSelector.remove(i);
			}
		}
		incidentselector.innerHTML = ""; // Clear existing options
		incidents.forEach((Incident, index) => {
				const opt = document.createElement("option");
				opt.value = index;
				opt.text = Incident.title;
				opt.dataset.index = index;
				opt.addEventListener("click", function(evt) { /* ... same listener as initialize ... */ });
				incidentselector.add(opt);
		});
	
		// Repopulate consequence dropdowns
		for (let j = 0; j < 3; j++) {
				const conseqSelector = document.getElementById(`conseq${j + 1}`);
				if (conseqSelector) {
						conseqSelector.innerHTML = ""; // Clear existing options
						incidents.forEach((Incident) => {
								const opt = document.createElement("option");
								opt.value = Incident.title;
								opt.text = Incident.title;
								conseqSelector.add(opt);
						});
				}
		}
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function saveThisIncident() {
    // Saves the currently displayed data from the UI elements back into the incidents array object
    if (iIncident < 0 || iIncident >= incidents.length) {
        console.warn("saveThisIncident called with invalid iIncident:", iIncident);
        return; // Don't save if index is invalid
    }

    const currentIncident = incidents[iIncident];
    console.log(`Saving data for Incident ${iIncident}: "${currentIncident.title}"`);

    // Save Intro Text (encode before saving if necessary, but standard JSON handles newlines)
    currentIncident.introText = encodeString(introElement.value.trim()); // Encode %% back if needed, or just save raw text

    // Save Choices, Deltas, Consequences
    for (let i = 0; i < 3; i++) {
        if (!currentIncident.choices[i]) { // Ensure choice object exists
            currentIncident.choices[i] = new Choice();
        }
        const choiceData = currentIncident.choices[i];

        const choiceTextArea = document.getElementById(`choice${i}`);
        if (choiceTextArea) {
            choiceData.choiceText = encodeString(choiceTextArea.value);
        }

        const conseqSelector = document.getElementById(`conseq${i + 1}`);
        if (conseqSelector) {
            choiceData.consequence = conseqSelector.value; // Already updated by its own change listener
        }

        for (let j = 0; j < cHiddenVariables; j++) {
            const sliderIndex = i * cHiddenVariables + j;
            const slider = document.getElementById(`slider${sliderIndex}`);
            if (slider) {
                choiceData.delta[j] = parseInt(slider.value, 10); // Ensure it's stored as a number
            }
        }
    }
}
// --- Incident Management Buttons ---


// --- Utility Functions ---
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function addNewOptToincidentselect(index, Incident) {
	const opt = document.createElement("option");
	opt.value = index; // Store index in value
	opt.text = Incident.title;
	opt.dataset.index = index; // Store index in data attribute as well
	// opt.id = `menuItem${index}`; // ID might not be strictly necessary
	
	opt.addEventListener("click", function(evt) {
			const selectedIndex = parseInt(this.dataset.index, 10); // Get index from data attribute
			if (selectedIndex !== iIncident) {
					// Clear previous selection highlight
					const previousOption = incidentselector.options[iIncident];
					if (previousOption) {
							previousOption.style.backgroundColor = myPink; // Or specific non-selected color like myPink
							previousOption.style.color = "BLACK";
					}
	
					saveThisIncident(); // Save edits from the previously viewed Incident
					iIncident = selectedIndex;
					iChoice = 0; // Reset selected choice
					iChoiceIsValid = false;
					displayIncident(); // Display the newly selected one
					// Highlight is now set within displayIncident
			}
	});
	opt.selected = false;
	opt.style.backgroundColor = myPink; // Or specific non-selected color like myPink
	opt.style.color = "BLACK";
	incidentselector.add(opt);
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function showPalmCalculations() {
	console.log("showing leafSetter");
	  var x = document.getElementById("leafSetter");
    x.style.display = "grid";

}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function hidePalmCalculations() {
	console.log("hiding leafSetter");
	  var x = document.getElementById("leafSetter");
    x.style.display = "none";

}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function encodeString(theString) {
    // Encodes problematic characters if needed for specific storage/display.
    // Standard JSON handles \n and ", so this is mainly for the %% paragraph logic.
    // Let's assume %% is the primary target here.
    // If you need to replace literal \n and ", uncomment those lines.
    // theString = theString.replaceAll("\n", "%"); // Use %% for paragraphs instead
    // theString = theString.replaceAll("\"", "#");
    return theString; // Return unmodified if only using %% split
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function decodeString(theString) {
    // Decodes strings encoded by encodeString.
    // theString = theString.replaceAll("%", "\n");
    // theString = theString.replaceAll("#", "\"");
    return theString; // Return unmodified if only using %% split
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
function getIncidentIndex(IncidentTitle) {
    // Finds the index of an Incident by its title. Uses logical AND (&&).
    let i = 0;
    while (i < incidents.length) {
        if (incidents[i].title === IncidentTitle) {
            return i; // Found
        }
        i++;
    }
    return -1; // Not found
}


// --- Window Load ---
window.onload = initialize; // Start the application when the page is loaded