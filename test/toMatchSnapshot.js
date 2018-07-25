const path = require('path')
const jest = require('jest-snapshot')
const expect = require('expect')

function toMatchSnapshot(received, { test }) {
  // Intilize the SnapshotState, it’s responsible for actually matching
  // actual snapshot with expected one and storing results to `__snapshots__` folder
  const snapshotState = new jest.SnapshotState(test.file, {
    updateSnapshot: process.env.UPDATE_SNAPSHOT ? 'all' : 'new',
    snapshotPath: path.join(
      path.dirname(test.file),
      process.env.TEST_PROJECT,
      '__snapshots__',
      path.basename(test.file) + '.snap'
    ),
  })

  // Bind the `toMatchSnapshot` to the object with snapshotState and
  // currentTest name, as `toMatchSnapshot` expects it as it’s `this`
  // object members
  const matcher = jest.toMatchSnapshot.bind({
    snapshotState,
    currentTestName: test.title,
  })

  // Execute the matcher
  const result = matcher(received)

  // Store the state of snapshot, depending on updateSnapshot value
  snapshotState.save()

  // Return results outside
  return { result, snapshotState }
}

expect.extend({
  toMatchSnapshot(received, context) {
    const { result, snapshotState } = toMatchSnapshot(received, context)
    // There will be no report if we are updating the snapshot
    if (result.report) {
      console.log(result.report())
    } else if (snapshotState.updated) {
      console.log(
        `Updated ${snapshotState.updated} snapshot${
          snapshotState.updated > 1 ? 's' : ''
        } in test ${context.test.title}`
      )
    }
    expect(result.pass).toBe(true)
    return result
  },
})
