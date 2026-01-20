Feature: Dev Controls Panel
  As a developer
  I want to access development controls in the panel
  So that I can test and control virtual routes

  Scenario: Open dev panel and see virtual route controls
    Given I am on the homepage
    When I click on the dev gear button
    Then I should see the dev panel content
    And I should see the virtual route toggle in the panel
    And I should see the edit routes link in the panel

  Scenario: Toggle virtual route and see controls
    Given I am on the homepage
    When I click on the dev gear button
    And I click on the virtual route toggle
    Then I should see the route selector in the panel
    And I should see the route controls in the panel
    And I should see the player controls in the panel
    And I should see the previous button with title "POI précédent"
    And I should see the play/pause button
    And I should see the next button with title "POI suivant"

  Scenario: Dev control bar should only contain gear button
    Given I am on the homepage
    Then I should see the dev control bar
    And I should see the dev gear button
    And the dev control bar should not contain virtual route toggle
    And the dev control bar should not contain route selector
