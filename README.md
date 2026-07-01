# slubberdegullion

Here’s the Slubber99 window:

<img width="1800" height="934" alt="image" src="https://github.com/user-attachments/assets/5bfa502e-0238-4364-9c21-538fe227809f" />

### Left Column (Pink)
This is your list of Incidents. You are given 35 possible Incidents to work with; you cannot add or delete any Incidents; you can, however, rename an Incident or skip over it. When you need another Incident, simply rename one of the “Empty” Incidents and direct a previous Incident to connect to it.

To select an Incident to work on, simply click on it. The button at the top with the silly icon allows you to rename an Incident.

### Center Column (Light Blue)
This is where you do the bulk of your work. The labels at the top of this column (“Introduction” and “Options”) are not functional. My intention was to have the first label (“Introduction”) show the title of the Incident, but I haven’t done that yet. I cannot recall my intent with the “Options” label; I cannot recall what I had for breakfast this morning, either. Oh, wait, I didn’t have breakfast this morning…

The big box is where you enter the main text of the incident. Simply click in the box and start typing. 

Underneath that, in green, is the text of each of the three options. Simply click in the box to edit the text. When you click inside the box, it changes color and is outlined in blue to indicate that it is selected. Underneath the option text rectangle is a popup menu listing all the Incidents. Select the Incident that will be a consequence of this Option if the player chooses it. Ah, now I think I recall why I used a fixed-length array for the Incidents list: changing popup menus in JavaScript is a pain.

### Right Column (White)
This column allows you to modify the reactions to an option. There are three sets of reactions, one for each Option, because you have been granted by the grace of His Majesty The Magnificent Crawford exactly three global variables, no more, no less. Developers, please do not succumb to your insatiable urge to make it more complex by adding more global variables. The Magnificent Crawford sees all, hears all, and knows all: three global variables is the correct number.

You are permitted to change the names of each global variable. To do so, click on an Option to activate its reaction section, then click on the name of the global variable you wish to rename, type in the new text, and hit return. 

You adjust the differential values (which are entered into a Bounded Number calculation) by sliding the stupid green circles left or right. Those stupid green circles are the default values for this device; I’d really appreciate it if somebody would change those to something more useful.

Lastly, there’s a special-case feature: when you select the Incident “PalmNode” (near the bottom), you get a special set of controls on the right bottom corner:

<img width="1226" height="472" alt="image" src="https://github.com/user-attachments/assets/5130313d-0e63-4d57-a98c-6e8a534b0234" />

These determine which of the three palm leaves is chosen at the conclusion of the story. There is one pop-up menu for each of the three global variables. That pop-up menu specifies the weighting assigned to that global variable. It has five menu items: All, Big, Some, Small, and None. “All" corresponds to full weight to that global variable; “None” corresponds to zero weight for that global variable. Yes, I could have used a slider to permit the author to select a precise numeric value. But The Magnificent Crawford already knows that nobody is smart enough to be able to determine the difference between a weighting value of 0.25 and 0.30. When authors have enough experience to make that differentiation, we can use sliders.

The little circular buttons marked “+” will change to “-“ when pushed. They allow the author to decide whether the global variable adds to or subtracts from the likelihood that its Palm Leaf will be selected as the outcome of the story.

That’s it!
