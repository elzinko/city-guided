Feature: Developer Panel
  As a developer
  I want to open and close the developer panel
  So that I can access development tools

  Scenario: Open and close developer panel
    Given I am on the homepage
    Then I should see the developer panel button
    When I click the developer panel button
    Then the developer panel should be visible
    And the bottom menu should not be visible
    When I click the close button in the developer panel
    Then the developer panel should not be visible
    And the bottom menu should be visible again

  Scenario: Pause and resume audio playback
    Given I am on the homepage
    When I click the developer panel button
    Then the developer panel should be visible
    When I select a route in the developer panel
    And I start the simulation
    And audio playback starts
    When I click the pause button in the developer panel
    Then audio playback should be paused
    When I click the play button in the developer panel
    Then audio playback should resume from the same position

  Scenario: Navigation buttons work after simulation ends
    Given I am on the homepage
    When I click the developer panel button
    Then the developer panel should be visible
    When I select a route in the developer panel
    And I start the simulation
    And I wait for the simulation to reach the end
    Then the simulation should be stopped
    When I click the previous POI button
    Then the user position should update
    And the step indicator should decrease
    When I click the next POI button
    Then the user position should update again
    And the step indicator should increase

