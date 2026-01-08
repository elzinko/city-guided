Feature: GPS Button Functionality
  As a user
  I want to use the GPS button to recenter the map on my position
  So that I can always find my location on the map

  Background:
    Given I am on the homepage
    And the map is visible

  Scenario: GPS button is visible on homepage
    Then I should see the GPS button

  Scenario: GPS button recenters map on real GPS position without virtual route
    Given the virtual route is not activated
    And my position is displayed on the map
    When I pan the map away from my position
    And I click the GPS button
    Then the map should be centered on my real GPS position
    And the zoom level should not change

  Scenario: GPS button keeps centering on real position after multiple clicks
    Given the virtual route is not activated
    When I click the GPS button multiple times
    Then the map should stay centered on my real GPS position

  Scenario: GPS button centers on virtual route start when activated
    Given I open the developer panel
    And I activate the virtual route
    And I close the developer panel
    When I click the GPS button
    Then the map should be centered on the virtual route start position
