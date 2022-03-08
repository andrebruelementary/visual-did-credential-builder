package com.elementarysoftware.vdcb.tree;

import java.util.List;
import java.util.Vector;

import org.eclipse.jface.viewers.ITreeContentProvider;

import com.elementarysoftware.prism.DID;

import io.iohk.atala.prism.identity.PrismKeyInformation;
import io.iohk.atala.prism.protos.models.LedgerData;

public class DIDDataModelTreeContentProvider implements ITreeContentProvider {
	
	//private PrismDidDataModel model;
	private DID did;

	public DIDDataModelTreeContentProvider(DID d) {
		did = d;
	}

	@Override
	public Object[] getElements(Object inputElement) {
		//System.out.println("getElements");
		//return did.getDataModel().getPublicKeys();
		List<Object> elements = new Vector<Object>();
		PrismKeyInformation[] keys = did.getDataModel().getPublicKeys();
		
		for(int i = 0; i < keys.length; i++) {
			elements.add(new PrismKeyTreeObject(keys[i]));
		}
		
		return elements.toArray();
		
	}

	@Override
	public Object[] getChildren(Object parentElement) {
		//System.out.println("getChildren");
		List<Object> children = new Vector<Object>();
		
		if(parentElement.getClass() == PrismKeyTreeObject.class) {
			children = new Vector<Object>();
			PrismKeyTreeObject to = ((PrismKeyTreeObject) parentElement);
			//children.add(0, keyInfo.getKeyId());
			//children.add(1, keyInfo.getKeyTypeEnum());
			//children.add(2, keyInfo.getPublicKey());
			if(to.getAddedOn() != null)
				children.add(new PrismTimestampTreeObject(to.getAddedOn(),PrismTimestampTreeObject.TYPE_ADDED));
			if(to.getRevokedOn() != null) 
				children.add(new PrismTimestampTreeObject(to.getRevokedOn(), PrismTimestampTreeObject.TYPE_REVOKED));
		}
		/*else if(parentElement.getClass() == LedgerData.class) {
			LedgerData ldata = ((LedgerData) parentElement);
			
			System.out.println("ledger:"+ ldata.getLedger());
			System.out.println("transaction id:"+ ldata.getTransactionId());
			System.out.println("timestamp:"+ ldata.getTimestampInfo().toString());
			
			return ir.get(PrismImageRegistry.ADDED_DATE);
			
			
		}*/
		else {
			System.out.println("DIDDataModelTreeContentProvider: No getChildren() configured for class "+ parentElement.getClass().toString());
		}
		return children.toArray();
	}

	@Override
	public Object getParent(Object element) {
		//System.out.println("getParent");
		//System.out.println(element.getClass().toString());
		if(element.getClass() == PrismKeyInformation.class) {
			return did;
		}
		else {
			System.out.println("DIDDataModelTreeContentProvider: No getParent() configured for class "+ element.getClass().toString());
		}
		
		return null; 
	}

	@Override
	public boolean hasChildren(Object element) {
		//System.out.println("hasChildren");
		Object[] obj = getChildren(element);
		return obj == null ? false : obj.length > 0;
	}

}
