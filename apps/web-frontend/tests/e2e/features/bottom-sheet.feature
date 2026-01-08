Feature: Panneau Glissant
  As a user
  I want to interact with the sliding panel
  So that I can view and navigate content

  Scenario: Ouverture du panneau depuis le menu
    Given I am on the homepage
    When I click on "Découvrir" tab
    Then the bottom sheet should slide up to mid position
    And I should see POI items in the sheet

  Scenario: Fermeture du panneau
    Given I am on the homepage with open bottom sheet
    When I click the close button (X)
    Then the bottom sheet should be hidden
    And only the bottom menu should be visible

  Scenario: Fermeture du panneau de résultats réaffiche le menu
    Given I am on the homepage
    When I click on a quick search chip (e.g., "Château")
    Then I should see search results in the bottom sheet
    And the bottom menu should be hidden
    And the bottom sheet should be at mid position
    When I click the close button (X) on the bottom sheet
    Then the bottom sheet should be hidden
    And the bottom menu should be visible again
    And the search query should be cleared

