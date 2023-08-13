import React, { useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM, { RtmClient } from 'agora-rtm-sdk';
import { VideoPlayer } from './VideoPlayer';

const APP_ID = '5f41eed412454d93ab8e2d9b61430bc6';
const TOKEN = '007eJxTYJjSdzdiSrfe0RV/sqrmh22af7Dt3vzw+6FTdjN5lr3at4hTgcE0zcQwNTXFxNDIxNQkxdI4Mcki1SjFMsnM0MTYICnZrMz4ZkpDICNDDJ8XEyMDBIL4bAwlqYUFRfkMDABEdCHL'
const CHANNEL = 'teqpro';

const client = AgoraRTC.createClient({
  mode: 'rtc',
  codec: 'vp8',
});

const rtmUid = String(Math.floor(Math.random()) * 2032)
let rtmClient;
let channel;

const  initRtm = async (name) => {
  rtmClient = AgoraRTM.createInstance(APP_ID);
  await rtmClient.login({'uid': rtmUid, 'token': TOKEN})

  channel = rtmClient.createChannel(CHANNEL)
  await channel.join()

  channel.on('MemberJoined', handleMemberJoined)
  channel.on('MemberLeft', handleMemberLeft)
}

export const VideoRoom = () => {
  const [users, setUsers] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);

  const handleUserJoined = async (user, mediaType) => {
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
      setUsers((previousUsers) => [...previousUsers, user]);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play()
    }
  };

  const handleUserLeft = (user) => {
    setUsers((previousUsers) =>
      previousUsers.filter((u) => u.uid !== user.uid)
    );
  };

  useEffect(() => {
    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    client
      .join(APP_ID, CHANNEL, TOKEN, null)
      .then((uid) =>
        Promise.all([
          AgoraRTC.createMicrophoneAndCameraTracks(),
          uid, initRtm(CHANNEL)
        ])
      )
      .then(([tracks, uid]) => {
        const [audioTrack, videoTrack] = tracks;
        setLocalTracks(tracks);
        setUsers((previousUsers) => [
          ...previousUsers,
          {
            uid,
            videoTrack,
            audioTrack,
          },
        ]);
        client.publish(tracks);
      });

    return () => {
      for (let localTrack of localTracks) {
        localTrack.stop();
        localTrack.close();
      }
      client.off('user-published', handleUserJoined);
      client.off('user-left', handleUserLeft);
      client.unpublish(tracks).then(() => client.leave());
    };
  }, []);

  return (
    <div
      style={{ display: 'flex', justifyContent: 'flex-start' }}
    >
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `'repeat(2, 200px)'`,
          gridGap: 10
        }}
      >
        {users.map((user) => (
          <VideoPlayer key={user.uid} user={user} />
        ))}
      </div>
    </div>
  );
};