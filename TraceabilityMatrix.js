function TraceabilityMatrix() {
    var dataSource, chooser, chooseButton, epicTable, childTable;

    this.display = function() {
        dataSource = new rally.sdk.data.RallyDataSource(
                '__WORKSPACE_OID__',
                '__PROJECT_OID__',
                '__PROJECT_SCOPING_UP__',
                '__PROJECT_SCOPING_DOWN__');

        rally.sdk.ui.AppHeader.showPageTools(true);
        rally.sdk.ui.AppHeader.addPageTool(rally.sdk.ui.PageTools.BuiltIn.Print);
        rally.sdk.ui.AppHeader.setHelpTopic("257");

        dataSource.find({
            key:"prd",
            type:"HierarchicalRequirement",
            query: "( Tags.Name = PRD )",
            fetch:"Name"
        }, dojo.hitch(this, this._showChooserOrInstructions));
    };

    this._showChooserOrInstructions = function(results) {
        if (results.prd.length > 0) {
            dojo.byId("signAndDate").innerHTML =
                    'Signature _________________________<br/>' +
                            'Date Printed ' + dojo.date.locale.format(new Date(), 'MM/DD/yyyy');

            if (!chooseButton) {
                chooseButton = new rally.sdk.ui.basic.Button({text:'Choose a Product Requirement'});
                chooseButton.display('chooseButton', function() {
                    chooser.display();
                });
            }

            var chooserConfig = {
                fetch:"FormattedID,Name,Description",
                query:'Tags.Name = PRD',
                title: 'Product Requirement Chooser'
            };
            chooser = new rally.sdk.ui.Chooser(chooserConfig, dataSource);
            chooser.addEventListener('onClose', dojo.hitch(this, this._displayChosenPRD));
            chooser.display();

        } else {
            var instructionsDiv = document.createElement("div");
            dojo.addClass(instructionsDiv, "instructions");

            var instructions = document.createElement("span");
            dojo.addClass(instructions, "quote");
            instructions.innerHTML = "<p><b>No PRDs Found.</b></p><p>This app keys off of special tags.  To get started, you'll need to let Rally know which user stories represent your Product Requirements Documents by tagging them 'PRD'.</p><p >The Traceability Matrix App allows you to show traceability from product requirements to the test cases that prove their implementation and the corresponding results.</p>";
            instructionsDiv.appendChild(instructions);

            var learnMoreLinkElement = document.createElement("a");
            dojo.attr(learnMoreLinkElement, "href", "http://www.rallydev.com/help/traceability-matrix-0");
            dojo.attr(learnMoreLinkElement, "target", "new");
            learnMoreLinkElement.innerHTML = "Learn more about how to use the Traceability Matrix";
            instructions.appendChild(learnMoreLinkElement);

            var exampleImage = document.createElement("img");
            dojo.attr(exampleImage, "src", "/apps/resources/TraceabilityMatrix/example.png");
            dojo.addClass(exampleImage, "exampleImage");
            instructionsDiv.appendChild(exampleImage);

            dojo.byId("display").appendChild(instructionsDiv);
        }
    };

    this._displayChosenPRD = function(chooser, args) {
        dataSource.findAll({
            key:"epicStories",
            type:"HierarchicalRequirement",
            query: "( ObjectID = " + rally.sdk.util.Ref.getOidFromRef(args.selectedItem._ref) + ")",
            order:"Name",
            fetch:"Children,Name,TestCases,LastVerdict,Source,Risk,Attachments,LastRun,FormattedID,,Results,Tester,Owner,Type"
        }, dojo.hitch(this, this.showTables));
    };

    this.displayEpicTable = function(epic) {
        var tableConfig = {
            'columnKeys'   : ["FormattedId",'TestCaseFormattedId','TestCaseName',"Type",'Source', 'Risk','OwnerName','LastRun','LastVerdict','Attachment'],
            'columnHeaders': ["User Story",'Test Case ID','Test Case Name',"Type",'Source', 'Risk','Owner','Last Run','Last Verdict','Design Output'],
            sortingEnabled:false
        };
        var nameContainer = dojo.byId("prdName");
        nameContainer.innerHTML = this.objectToLinkMarkup(epic.FormattedID, epic);
        nameContainer.appendChild(document.createTextNode(" - " + epic.Name));
        epicTable = new rally.sdk.ui.Table(tableConfig);
        epicTable.addRows(this.createTableRowObject(epic, epic.Source));
        epicTable.display("parentTable");
    };

    this.displayChildTable = function(epic) {
        var tableConfig = {
            'columnKeys'   : ["FormattedId",'TestCaseFormattedId','TestCaseName',"Type",'Source', 'Risk','OwnerName','LastRun','LastVerdict','Attachment'],
            'columnHeaders': ["User Story",'Test Case ID','Test Case Name',"Type",'Source', 'Risk','Owner','Last Run','Last Verdict','Design Output'],
            sortingEnabled:false
        };
        var rows = [];
        dojo.forEach(epic.Children, function(child) {
            rows = rows.concat(this.createTableRowObject(child, epic.Source));
        }, this);
        childTable = new rally.sdk.ui.Table(tableConfig);
        childTable.addRows(rows);
        childTable.display("childTable");

    };

    this.objectToLinkMarkup = function(text, object) {
        return new rally.sdk.ui.basic.Link({
            text: text,
            item:object
        }).renderToHtml();
    };

    this.createAttachmentLink = function(attachment) {
        var href = "https://" + dataSource.getServer() + "/slm/attachment/" + rally.sdk.util.Ref.getOidFromRef(attachment) + "/" + attachment.Name;
        var linkElement = document.createElement("a");
        dojo.attr(linkElement, "href", href);
        linkElement.appendChild(document.createTextNode(attachment.Name));
        var container = document.createElement("div");
        container.appendChild(linkElement);
        var html = container.innerHTML;
        dojo.destroy(container);
        return html;
    };

    this.formatDate = function(dateString) {
        var dateObject = rally.sdk.util.DateTime.fromIsoString(dateString);
        return rally.sdk.util.DateTime.format(dateObject, "MM/dd/yyy");
    };

    this.createStoryRowObject = function(story, source) {
        var tempObject;
        tempObject = {};
        tempObject.FormattedId = this.objectToLinkMarkup(story.FormattedID, story) + "<span>-" + story.Name + "</span>";
        tempObject.Source = source;
        tempObject.Name = story.Name;
        return tempObject;
    };

    this.createTestCaseObject = function(story, source, testCase, attachment) {
        var tempObject = this.createStoryRowObject(story, source);
        if (attachment) {
            tempObject.Attachment = this.createAttachmentLink(attachment);
        }

        if (testCase) {
            tempObject.TestCase = testCase;
            tempObject.Type = testCase.Type;
            tempObject.OwnerName = testCase.Owner._refObjectName;
            tempObject.TestCaseFormattedId = this.objectToLinkMarkup(testCase.FormattedID, testCase);
            tempObject.TestCaseName = testCase.Name;
            tempObject.LastVerdict = testCase.LastVerdict || "...";
            tempObject.LastRun = testCase.LastRun ? this.formatDate(testCase.LastRun) : "...";
            tempObject.Risk = testCase.Risk;
        }

        return tempObject;
    };

    this.createTableRowObject = function(input, source) {
        try {
            var results = [];
            var story = dojo.clone(input);
            while (story.Attachments.length + story.TestCases.length) {
                var currentAttachment = story.Attachments.length ? story.Attachments.pop() : false;
                var currentTestCase = story.TestCases.length ? story.TestCases.pop() : false;
                results.push(this.createTestCaseObject(story, source, currentTestCase, currentAttachment));
            }
            if (results.length) {
                results.sort(function(a, b) {
                    if (a.FormattedId === b.FormattedId) {
                        return a.TestCaseFormattedId > b.TestCaseFormattedId;
                    }
                    return a.FormattedId > b.FormattedId;
                });
                return results;
            }
            else {
                return [this.createStoryRowObject(story, source)];
            }
        }
        catch(ex) {
            console.log(ex.stack);
            throw ex;
        }
    };


    this.showTables = function(results) {

        if (epicTable) {
            epicTable.destroy();
        }

        if (childTable) {
            childTable.destroy();
        }

        if (!results.epicStories || !results.epicStories.length) {
            console.log("No epic stories found for objectId");
            return;
        }
        var story = results.epicStories.pop();
        dojo.byId("parentTableContainer").style.display = "block";
        dojo.byId("childTableContainer").style.display = "block";
        this.displayEpicTable(story);
        this.displayChildTable(story);

    };
}