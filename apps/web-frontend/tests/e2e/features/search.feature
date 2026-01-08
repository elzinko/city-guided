Feature: Recherche de Points d'Intérêt
  As a user
  I want to search for points of interest
  So that I can find places to visit

  Scenario: Recherche basique
    Given I am on the homepage
    Then I should see quick search chips
    When I click on the search bar
    Then I should see the search overlay
    And I should see saved addresses section
    When I type "Château" in the search field
    And I press Enter
    Then I should see search results
    And the bottom menu should be hidden
    And the search overlay should be closed

  Scenario: Recherche avec chip rapide
    Given I am on the homepage
    When I click on the "Château" quick search chip
    Then I should see search results for "Château" in the bottom sheet
    And the bottom menu should be hidden
    And the search overlay should be closed
    And the bottom sheet should be at mid position

  Scenario: Fermeture de la recherche efface le texte et sauvegarde pour réaffichage
    Given I am on the homepage
    When I click on the search bar
    And I type "test" in the search field
    And I click the back arrow
    Then the search overlay should be closed
    And the bottom menu should be visible
    And the search query should be cleared
    And the panneau découverte should not be visible
    When I click on the search bar again
    Then the search overlay should appear
    And the search field should contain "test"

  Scenario: Recherche active cache le menu
    Given I am on the homepage
    When I activate the search (click on search bar)
    Then the bottom menu should not be visible
    When I close the search
    Then the bottom menu should be visible again

  Scenario: Recherche rapide affiche les résultats correctement
    Given I am on the homepage
    When I click on the "Musée" quick search chip
    Then the search overlay should be closed
    And the bottom sheet should slide up to mid position
    And I should see search results for "Musée"
    And the bottom menu should be hidden
    When I click the close button (X) on the bottom sheet
    Then the bottom sheet should be hidden
    And the bottom menu should be visible again

