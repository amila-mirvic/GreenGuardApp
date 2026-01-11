import React from 'react'
import { Modal } from 'react-native'
import FullStories from '../FullStories/FullStories'
import styles from './styles'
import { observer } from 'mobx-react'

@observer
export default class FullStoriesModal extends React.Component {
  render() {
    const { isModalOpen, onClosed } = this.props
    return (
      <Modal
        style={styles.container}
        visible={isModalOpen}
        onDismiss={onClosed}
        onRequestClose={onClosed}
        animationType={'slide'}
        transparent={true}
      >
        <FullStories />
      </Modal>
    )
  }
}
