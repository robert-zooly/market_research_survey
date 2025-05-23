-- Update the Hip Replacement survey to fix Q14
-- Replace 'YOUR_SURVEY_ID' with the actual survey ID from your database

UPDATE surveys
SET json_schema = jsonb_set(
    json_schema,
    '{pages,5,elements,1}',
    '{
      "type": "checkbox",
      "name": "compelling_benefits",
      "title": "Which benefit is most compelling to you? (Select up to 2)",
      "isRequired": true,
      "validators": [
        {
          "type": "expression",
          "text": "Please select between 1 and 2 options",
          "expression": "{compelling_benefits}.length >= 1 and {compelling_benefits}.length <= 2"
        }
      ],
      "choices": [
        "Improved component positioning accuracy",
        "Simplified workflow with 5-minute setup",
        "Enhanced confidence during surgery",
        "Reduced operative time",
        "Cost savings per case",
        "No capital investment required",
        "Compatibility with my preferred implants"
      ]
    }'::jsonb
)
WHERE name = 'YOUR_SURVEY_NAME_HERE';

-- Or if you know the survey ID:
-- WHERE id = 'YOUR_SURVEY_ID_HERE';