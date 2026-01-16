Feature: Homepage Display
  As a user
  I want to see the homepage with the map
  So that I can start exploring the city

  Scenario: Display homepage with essential components
    Given I am on the homepage
    Then I should see the homepage container
    And I should see the map container
    And I should see the search bar
