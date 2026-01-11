Feature: GPS Player Navigation
  As a user
  I want to control GPS simulation from the main map
  So that I can navigate through route points smoothly

  Scenario: GPS player appears when a route is loaded
    Given I am on the homepage
    When I click the developer panel button
    Then the developer panel should be visible
    When I select a route in the developer panel
    And I close the developer panel
    Then the GPS player should be visible on the main map
    And I should see the step indicator showing "Étape 1/X"
    And I should see the play button in the GPS player
    And I should see the previous and next buttons in the GPS player
    And I should see the speed accelerator slider in the GPS player

  Scenario: GPS player controls work correctly
    Given I am on the homepage
    And a route is loaded
    When I click the play button in the GPS player
    Then the GPS simulation should start
    And the point should move progressively along the route
    When I click the pause button in the GPS player
    Then the GPS simulation should pause
    When I click the play button in the GPS player again
    Then the GPS simulation should resume

  Scenario: Navigation buttons work in GPS player
    Given I am on the homepage
    And a route is loaded
    And the GPS simulation is running
    When I click the previous button in the GPS player
    Then the step indicator should decrease
    And the user position should update
    When I click the next button in the GPS player
    Then the step indicator should increase
    And the user position should update

  Scenario: Speed accelerator works in GPS player
    Given I am on the homepage
    And a route is loaded
    And the GPS simulation is running
    When I adjust the speed accelerator slider
    Then the speed value should update
    And the simulation speed should change

  Scenario: GPS player is hidden when guide mode is active
    Given I am on the homepage
    And a route is loaded
    Then the GPS player should be visible
    When I activate guide mode
    Then the GPS player should not be visible
