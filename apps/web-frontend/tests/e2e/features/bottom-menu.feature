Feature: Menu de Navigation du Bas
  As a user
  I want to navigate between different sections
  So that I can access different features

  Scenario: Affichage du menu par défaut
    Given I am on the homepage
    Then I should see the bottom menu
    And the menu should have three tabs: "Découvrir", "Enregistrés", "Contribuer"
    And "Découvrir" should be the active tab

  Scenario: Changement de tab
    Given I am on the homepage
    When I click on "Enregistrés" tab
    Then "Enregistrés" should be the active tab
    And the bottom sheet should be visible
    And the sheet title should be "Enregistrés"
    When I click on "Contribuer" tab
    Then "Contribuer" should be the active tab

  Scenario: Menu caché en mode recherche
    Given I am on the homepage
    When I activate the search (click on search bar)
    Then the bottom menu should not be visible
    When I close the search without results
    Then the bottom menu should be visible again

  Scenario: Menu caché avec résultats de recherche
    Given I am on the homepage
    When I perform a search that returns results
    Then the bottom menu should not be visible
    And the bottom sheet should show search results

